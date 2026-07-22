import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { StyledCard } from '../components/StyledCard';
import { theme } from '../theme/theme';
import { useCompany } from '../contexts/CompanyContext';
import {
    OwlPayEmailConfig,
    OwlPayCamper,
    OwlPayStaff,
    OwlPayItem,
    ReportAudience,
    useOwlPayCampers,
    useOwlPayEmailConfig,
    useOwlPayItems,
    useOwlPayReports,
    useOwlPayStaff,
    useOwlPayStaffSpendRows,
    useDeleteOwlPayItem,
    useSaveOwlPayEmailConfig,
    useSaveOwlPayItem,
} from '../api/owlpay';
import { supabase } from '../lib/supabase';
import { enqueueSync, isOnlineNow } from '../offline/engine';
import {
    buildOwlPayPurchaseRows,
    calculateOwlPayCartPricing,
} from '../lib/owlPayFreeItem';
import {
    calculateOwlPayNewBalance,
    formatOwlPayBalanceHint,
    getOwlPayBalanceTone,
    OWL_PAY_MAX_OVERDRAFT,
    wouldExceedOwlPayOverdraft,
} from '../lib/owlPayBalanceUtils';
import {
    formatCampReportDateTime,
    getOwlPayQuickRangeYmd,
} from '../lib/owlPayReports';
import {
    completeOwlPayCheckout,
    isFreeDailyItemAvailableToday,
    recordOwlPayFirstDailyScan,
} from '../lib/owlPayCheckout';
import {
    findInListByRfid,
    lookupOwlPayCamperByRfid,
    lookupOwlPayStaffByRfid,
    normalizeRfidInput,
    rfidsMatch,
} from '../lib/rfidUtils';

type OwlPayTab = 'pos' | 'items' | 'balances' | 'reports' | 'settings';
type ItemCategory = 'Food' | 'Snacks' | 'Drinks' | 'Other';

const currency = (amount: number) => `$${amount.toFixed(2)}`;

function toCsvCell(v: unknown): string {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

const getInitials = (name?: string | null) =>
    (name || '')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

/** RFID wedge scanners send characters faster than manual typing. */
const RFID_WEDGE_CHAR_MS = 100;
const RFID_WEDGE_SUBMIT_MS = 180;
const RFID_MIN_LENGTH = 4;

export const OwlPayScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<OwlPayTab>('pos');
    const [camperQuery, setCamperQuery] = useState('');
    const [selectedCamperId, setSelectedCamperId] = useState<string | null>(null);
    const [selectedIsStaff, setSelectedIsStaff] = useState(false);
    const [hasFreeDailyItemAvailable, setHasFreeDailyItemAvailable] = useState(false);
    const [cart, setCart] = useState<Array<OwlPayItem & { quantity: number }>>([]);
    const [isCompletingTransaction, setIsCompletingTransaction] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'Snacks' as ItemCategory });
    const [reportsRange, setReportsRange] = useState<'Today' | 'This Week' | 'This Month' | 'All Time'>('Today');
    const [lowBalanceAlertsEnabled, setLowBalanceAlertsEnabled] = useState(false);
    const [staffReportsEnabled, setStaffReportsEnabled] = useState(false);
    const [staffReportFrequency, setStaffReportFrequency] = useState('daily');
    const [lowBalanceThreshold, setLowBalanceThreshold] = useState('5');
    const [lowBalanceRecipientEmail, setLowBalanceRecipientEmail] = useState('');
    const [staffReportRecipientEmail, setStaffReportRecipientEmail] = useState('');
    const [itemToDelete, setItemToDelete] = useState<OwlPayItem | null>(null);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [successData, setSuccessData] = useState<{
        camperName: string;
        chargedAmount: number;
        newBalance: number;
        freeItemApplied: boolean;
        isStaff: boolean;
    } | null>(null);
    const [firstScanCamper, setFirstScanCamper] = useState<{ id: string; name: string; photo_url?: string | null } | null>(null);
    const [processingFirstScan, setProcessingFirstScan] = useState(false);
    const [selectedCamperSnapshot, setSelectedCamperSnapshot] = useState<OwlPayCamper | null>(null);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [scanBuffer, setScanBuffer] = useState('');
    const [lastScanInputAt, setLastScanInputAt] = useState(0);
    const [isWedgeScanning, setIsWedgeScanning] = useState(false);
    const scanResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scanSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scanInputRef = useRef<TextInput>(null);
    const isWedgeScanRef = useRef(false);
    const { width: windowWidth } = useWindowDimensions();
    const isWidePos = windowWidth >= 768;
    const [balanceAudience, setBalanceAudience] = useState<'campers' | 'staff'>('campers');
    const [balanceSearch, setBalanceSearch] = useState('');
    const [reportAudience, setReportAudience] = useState<ReportAudience>('all');
    const [reportsSubTab, setReportsSubTab] = useState<'by-item' | 'by-person' | 'over-time' | 'purchases'>('by-item');
    const [reportSearch, setReportSearch] = useState('');
    const [settingsAudience, setSettingsAudience] = useState<'campers' | 'staff'>('campers');
    const { companyId, season, companySlug } = useCompany();
    const queryClient = useQueryClient();

    const tabs: { key: OwlPayTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: 'pos', label: 'POS', icon: 'cart-outline' },
        { key: 'items', label: 'Items', icon: 'cube-outline' },
        { key: 'balances', label: 'Balances', icon: 'cash-outline' },
        { key: 'reports', label: 'Reports', icon: 'bar-chart-outline' },
        { key: 'settings', label: 'Settings', icon: 'settings-outline' },
    ];

    const camperListSearch =
        activeTab === 'pos'
            ? ''
            : activeTab === 'balances' && balanceAudience === 'campers'
              ? balanceSearch
              : '';
    const staffListSearch =
        activeTab === 'pos'
            ? ''
            : activeTab === 'balances' && balanceAudience === 'staff'
              ? balanceSearch
              : '';

    const { data: campers = [], isLoading: campersLoading } = useOwlPayCampers(companyId, season, camperListSearch);
    const { data: staffMembers = [], isLoading: staffLoading } = useOwlPayStaff(companyId, season, staffListSearch);
    const posCampers = useMemo(() => {
        const q = camperQuery.trim();
        if (!q || isWedgeScanning || scanStatus === 'scanning') return campers;
        const lower = q.toLowerCase();
        return campers.filter(
            (camper) => camper.name.toLowerCase().includes(lower) || rfidsMatch(camper.rfid, q),
        );
    }, [campers, camperQuery, isWedgeScanning, scanStatus]);

    const posStaff = useMemo(() => {
        const q = camperQuery.trim();
        if (!q || isWedgeScanning || scanStatus === 'scanning') return staffMembers;
        const lower = q.toLowerCase();
        return staffMembers.filter(
            (staff) => staff.name.toLowerCase().includes(lower) || rfidsMatch(staff.rfid, q),
        );
    }, [staffMembers, camperQuery, isWedgeScanning, scanStatus]);

    const focusScanInput = () => {
        if (activeTab !== 'pos') return;
        setTimeout(() => scanInputRef.current?.focus(), Platform.OS === 'ios' ? 250 : 100);
    };
    const { data: allItems = [], isLoading: itemsLoading } = useOwlPayItems(companyId, true);
    const { data: settings, isLoading: settingsLoading } = useOwlPayEmailConfig(companyId);
    const saveItemMutation = useSaveOwlPayItem();
    const deleteItemMutation = useDeleteOwlPayItem();
    const saveSettingsMutation = useSaveOwlPayEmailConfig();

    useEffect(() => {
        if (!companyId) return;

        const channel = supabase
            .channel(`owlpay-mobile-${companyId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'children', filter: `company_id=eq.${companyId}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['owlpay_campers'] });
                    queryClient.invalidateQueries({ queryKey: ['owlpay_reports'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'staff', filter: `company_id=eq.${companyId}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['owlpay_staff'] });
                    queryClient.invalidateQueries({ queryKey: ['owlpay_staff_spend', companyId] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'owl_pay_items', filter: `company_id=eq.${companyId}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['owlpay_items'] });
                    queryClient.invalidateQueries({ queryKey: ['owlpay_reports'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'owl_pay_transactions', filter: `company_id=eq.${companyId}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['owlpay_reports'] });
                    queryClient.invalidateQueries({ queryKey: ['owlpay_campers'] });
                    queryClient.invalidateQueries({ queryKey: ['owlpay_staff_spend', companyId] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'owl_pay_email_config', filter: `company_id=eq.${companyId}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['owlpay_email_config'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [companyId, queryClient]);

    useEffect(() => {
        if (activeTab !== 'pos' || !companyId) return;
        queryClient.invalidateQueries({ queryKey: ['owlpay_items', companyId] });
    }, [activeTab, companyId, queryClient]);

    const reportRangeYmd = useMemo(() => {
        const key =
            reportsRange === 'Today'
                ? 'today'
                : reportsRange === 'This Week'
                  ? 'week'
                  : reportsRange === 'This Month'
                    ? 'month'
                    : 'all';
        return getOwlPayQuickRangeYmd(key);
    }, [reportsRange]);

    const { data: reportsData, isLoading: reportsLoading } = useOwlPayReports(
        companyId,
        season,
        reportRangeYmd.fromYmd,
        reportRangeYmd.toYmd,
        reportAudience,
        reportSearch
    );

    const { data: staffSpendRows = [], isLoading: staffSpendLoading } = useOwlPayStaffSpendRows(companyId, season);

    const selectedCamper =
        campers.find((c) => c.id === selectedCamperId) ||
        (selectedCamperSnapshot?.id === selectedCamperId ? selectedCamperSnapshot : null);
    const selectedStaff = selectedIsStaff ? staffMembers.find((s) => s.id === selectedCamperId) || null : null;
    const selectedDisplayName = selectedIsStaff ? selectedStaff?.name : selectedCamper?.name;
    const totalBalance = campers.reduce((sum, camper) => sum + Number(camper.owl_pay_balance || 0), 0);
    const averageBalance = campers.length ? totalBalance / campers.length : 0;
    const totalStaffSpendAll = staffSpendRows.reduce((sum, r) => sum + r.total_spent, 0);
    const avgStaffSpendDisplay = staffSpendRows.length ? totalStaffSpendAll / staffSpendRows.length : 0;
    const posActiveItems = useMemo(() => allItems.filter((item) => item.active), [allItems]);
    const cartPricing = useMemo(
        () =>
            calculateOwlPayCartPricing(
                cart.map((item) => ({
                    id: item.id,
                    name: item.name,
                    price: Number(item.price),
                    category: item.category,
                    quantity: item.quantity,
                })),
                {
                    hasFreeDailyItemAvailable,
                    isStaff: selectedIsStaff,
                }
            ),
        [cart, hasFreeDailyItemAvailable, selectedIsStaff]
    );
    const subtotal = cartPricing.subtotal;
    const total = cartPricing.total;
    const freeDiscount = cartPricing.freeDiscount;
    const currentBalance = Number(selectedCamper?.owl_pay_balance || 0);
    const newBalance = calculateOwlPayNewBalance(currentBalance, total, selectedIsStaff);
    const exceedsOverdraft = !selectedIsStaff && cart.length > 0 && wouldExceedOwlPayOverdraft(currentBalance, total);
    const newBalanceTone = getOwlPayBalanceTone(newBalance);
    const scanStatusLabel =
        scanStatus === 'scanning'
            ? 'Reading scanner input...'
            : scanStatus === 'success'
              ? 'RFID matched successfully'
              : scanStatus === 'error'
                ? 'RFID not found'
                : 'Ready to scan RFID';

    const exportReportsCsv = async () => {
        if (!reportsData || !companyId) {
            Alert.alert('Nothing to export', 'Load reports first.');
            return;
        }
        const fromLabel = reportRangeYmd.fromYmd;
        const toLabel = reportRangeYmd.toYmd;
        const aud = reportAudience === 'all' ? 'all-buyers' : reportAudience;
        const slug = companySlug || 'camp';

        const lines: (string | number | boolean)[][] = [
            ['Report', 'Owl Pay'],
            ['Camp slug', slug],
            ['Season', season ?? ''],
            ['Date range (camp time)', `${fromLabel} to ${toLabel}`],
            ['Audience', reportAudience],
            ['Total revenue (paid items)', reportsData.totalRevenue.toFixed(2)],
            ['Items sold (paid)', reportsData.totalItems],
            ['Free daily items', reportsData.freeItems],
            ['Avg paid transaction', reportsData.avgTransaction.toFixed(2)],
            ['Most popular item', reportsData.mostPopular],
            [],
            [
                'By person — Name',
                'Type',
                'Season',
                'Person ID',
                'Period spent',
                'Season spent',
                'Items bought',
                'CM deposits',
                'Full balance',
            ],
            ...reportsData.buyerSummaries.map((s) => [
                s.name,
                s.buyer_type,
                s.season ?? '',
                s.person_id ?? '',
                s.period_spent.toFixed(2),
                s.season_spent != null ? s.season_spent.toFixed(2) : '',
                s.period_items,
                s.cm_deposits != null ? s.cm_deposits.toFixed(2) : '',
                s.full_balance != null ? s.full_balance.toFixed(2) : s.current_balance != null ? s.current_balance.toFixed(2) : '',
            ]),
            [],
            ['Sales by item — Item', 'Category', 'Qty sold', 'Revenue'],
            ...reportsData.salesByItem.map((i) => [i.name, i.category, i.quantity, i.revenue.toFixed(2)]),
            [],
            ['Purchases — Date/time (camp)', 'Buyer type', 'Name', 'Item', 'Category', 'Amount', 'Free'],
            ...reportsData.purchasesAll.map((p: any) => [
                formatCampReportDateTime(p.purchased_at),
                p.buyer_type,
                p.camper_name,
                p.item_name,
                p.item_category,
                p.is_free ? '0.00' : p.amount.toFixed(2),
                p.is_free ? 'yes' : 'no',
            ]),
        ];

        const body = '\uFEFF' + lines.map((row) => row.map(toCsvCell).join(',')).join('\r\n');

        try {
            await Share.share({
                message: body,
                title: `owlpay-report_${slug}_${fromLabel}_${toLabel}_${aud}.csv`,
            });
        } catch (e: any) {
            Alert.alert('Export failed', e?.message || 'Could not open share sheet');
        }
    };

    const addItem = () => {
        const name = itemForm.name.trim();
        const price = Number(itemForm.price);
        if (!name || Number.isNaN(price) || price < 0) return;

        if (!companyId) return;
        saveItemMutation.mutate(
            {
                company_id: companyId,
                name,
                price,
                category: itemForm.category.toLowerCase(),
                active: true,
            },
            {
                onSuccess: () => {
                    setItemForm({ name: '', price: '', category: 'Snacks' });
                    setShowCategoryDropdown(false);
                    setShowAddItemModal(false);
                },
                onError: (err: any) => {
                    Alert.alert('Owl Pay', err?.message || 'Failed to save item');
                },
            }
        );
    };

    const confirmDeleteOwlPayItem = async () => {
        if (!itemToDelete?.id) return;
        console.log('[DELETE] owl_pay_items', itemToDelete.id, itemToDelete.name);
        setIsDeleting(true);
        try {
            await deleteItemMutation.mutateAsync({ id: itemToDelete.id, company_id: itemToDelete.company_id });
            if (companyId) {
                await queryClient.invalidateQueries({ queryKey: ['owlpay_items', companyId] });
            }
            setIsDeleteConfirmVisible(false);
            setItemToDelete(null);
        } catch (err: any) {
            Alert.alert('Owl Pay', err?.message || 'Failed to delete item');
        } finally {
            setIsDeleting(false);
        }
    };

    const checkFreeDailyItemAvailable = async (childId: string) => {
        if (!companyId) return false;
        return isFreeDailyItemAvailableToday(supabase, companyId, childId);
    };

    const handleSelectCamper = async (camperId: string, snapshot?: OwlPayCamper) => {
        setFirstScanCamper(null);
        setSelectedCamperId(camperId);
        setSelectedIsStaff(false);
        setCart([]);
        if (snapshot) {
            setSelectedCamperSnapshot(snapshot);
        } else {
            const fromList = campers.find((c) => c.id === camperId);
            if (fromList) setSelectedCamperSnapshot(fromList);
        }
        try {
            const hasFreeItem = await checkFreeDailyItemAvailable(camperId);
            setHasFreeDailyItemAvailable(hasFreeItem);
        } catch (err: any) {
            setHasFreeDailyItemAvailable(false);
            Alert.alert('Owl Pay', err?.message || 'Unable to check free item status');
        }
    };

    const openCamperCheckout = async (camper: {
        id: string;
        name: string;
        rfid?: string | null;
        photo_url?: string | null;
        owl_pay_balance?: number | null;
        person_id?: string | null;
    }) => {
        const snapshot: OwlPayCamper = {
            id: camper.id,
            name: camper.name,
            rfid: camper.rfid ?? null,
            photo_url: camper.photo_url ?? null,
            owl_pay_balance: Number(camper.owl_pay_balance ?? 0),
            person_id: camper.person_id ?? null,
        };
        setScanStatus('success');
        await handleSelectCamper(snapshot.id, snapshot);
        setCamperQuery('');
    };

    const handleSelectStaff = (staffId: string) => {
        setFirstScanCamper(null);
        setSelectedCamperSnapshot(null);
        setSelectedCamperId(staffId);
        setSelectedIsStaff(true);
        setHasFreeDailyItemAvailable(false);
        setCart([]);
    };

    const resetScanStatus = (delayMs = 1200) => {
        if (scanResetTimeoutRef.current) {
            clearTimeout(scanResetTimeoutRef.current);
        }
        scanResetTimeoutRef.current = setTimeout(() => {
            setScanStatus('idle');
            setScanBuffer('');
        }, delayMs);
    };

    const closeFirstScanModal = () => {
        setFirstScanCamper(null);
        setCamperQuery('');
        setScanStatus('idle');
        if (companyId) {
            queryClient.invalidateQueries({ queryKey: ['owlpay_campers'] });
        }
        focusScanInput();
    };

    useEffect(() => {
        if (!firstScanCamper) return;
        const timer = setTimeout(closeFirstScanModal, 3000);
        return () => clearTimeout(timer);
    }, [firstScanCamper]);

    const tryClaimFirstDailyScan = async (camper: { id: string; name: string; photo_url?: string | null }) => {
        if (!companyId || processingFirstScan) return false;

        try {
            const hasFreeItem = await checkFreeDailyItemAvailable(camper.id);
            if (!hasFreeItem) return false;
        } catch {
            // If we cannot verify, open normal checkout instead of blocking the scan.
            return false;
        }

        setProcessingFirstScan(true);
        try {
            const { data: authData } = await supabase.auth.getUser();
            const createdBy = authData.user?.id;
            const online = await isOnlineNow();

            if (online) {
                await recordOwlPayFirstDailyScan(supabase, {
                    companyId,
                    childId: camper.id,
                    createdBy,
                });
            } else {
                await enqueueSync('owl_pay.checkout.complete', {
                    companyId,
                    childId: camper.id,
                    staffId: null,
                    createdBy,
                    pricing: {
                        subtotal: 0,
                        freeDiscount: 0,
                        total: 0,
                        freeItemApplied: true,
                        freeItemLineId: null,
                        freeItemName: null,
                    },
                    transactions: [],
                });
            }

            setSelectedCamperId(null);
            setSelectedCamperSnapshot(null);
            setSelectedIsStaff(false);
            setHasFreeDailyItemAvailable(false);
            setCart([]);
            setScanStatus('success');
            setFirstScanCamper(camper);
            setCamperQuery('');
            return true;
        } catch (err: any) {
            const message = String(err?.message || '');
            if (message.toLowerCase().includes('already used')) {
                return false;
            }
            Alert.alert('Owl Pay', message || 'Unable to record free daily item');
            return false;
        } finally {
            setProcessingFirstScan(false);
        }
    };

    const selectByRFID = async (rfidRaw: string) => {
        const rfid = normalizeRfidInput(rfidRaw);
        if (!rfid) return false;

        const camperMatch =
            (companyId && season
                ? await lookupOwlPayCamperByRfid(rfid, companyId, season)
                : null) ?? findInListByRfid(campers, rfid);
        if (camperMatch) {
            const claimedFirstScan = await tryClaimFirstDailyScan(camperMatch);
            if (claimedFirstScan) {
                resetScanStatus(1000);
                return true;
            }

            await openCamperCheckout(camperMatch);
            resetScanStatus(1000);
            return true;
        }

        const staffMatch =
            (companyId && season
                ? await lookupOwlPayStaffByRfid(rfid, companyId, season)
                : null) ?? findInListByRfid(staffMembers, rfid);
        if (staffMatch) {
            setScanStatus('success');
            handleSelectStaff(staffMatch.id);
            setCamperQuery('');
            resetScanStatus(1000);
            return true;
        }

        setScanStatus('error');
        Alert.alert('RFID not found', `No camper or staff with RFID: ${rfid}`);
        resetScanStatus(1800);
        return false;
    };

    const clearScanField = () => {
        setCamperQuery('');
        setScanBuffer('');
    };

    const processRfidScan = async (raw: string) => {
        const rfid = normalizeRfidInput(raw);
        if (!rfid) return;

        if (scanSubmitTimeoutRef.current) {
            clearTimeout(scanSubmitTimeoutRef.current);
            scanSubmitTimeoutRef.current = null;
        }

        setIsWedgeScanning(false);
        isWedgeScanRef.current = false;
        const ok = await selectByRFID(rfid);
        if (ok) clearScanField();
    };

    const handleCamperQueryChange = (value: string) => {
        if (/[\r\n]/.test(value)) {
            const rfid = normalizeRfidInput(value);
            clearScanField();
            setIsWedgeScanning(false);
            isWedgeScanRef.current = false;
            if (rfid) void processRfidScan(rfid);
            return;
        }

        const now = Date.now();
        const timeDiff = now - lastScanInputAt;
        setLastScanInputAt(now);

        if (!value) {
            setScanStatus('idle');
            setScanBuffer('');
            setCamperQuery('');
            setIsWedgeScanning(false);
            isWedgeScanRef.current = false;
            if (scanSubmitTimeoutRef.current) {
                clearTimeout(scanSubmitTimeoutRef.current);
                scanSubmitTimeoutRef.current = null;
            }
            return;
        }

        const wedgeInput = value.length > 1 && timeDiff > 0 && timeDiff < RFID_WEDGE_CHAR_MS;
        if (wedgeInput) {
            isWedgeScanRef.current = true;
            setIsWedgeScanning(true);
            setScanStatus('scanning');
        } else if (value.length === 1) {
            isWedgeScanRef.current = false;
            setIsWedgeScanning(false);
        }

        setCamperQuery(value);
        setScanBuffer(value);

        if (isWedgeScanRef.current && value.length >= RFID_MIN_LENGTH) {
            if (scanSubmitTimeoutRef.current) clearTimeout(scanSubmitTimeoutRef.current);
            if (value.length >= RFID_MIN_LENGTH) {
                scanSubmitTimeoutRef.current = setTimeout(() => {
                    void processRfidScan(value);
                }, RFID_WEDGE_SUBMIT_MS);
            }
        }
    };

    const addToCart = (item: OwlPayItem) => {
        if (!item.active) return;
        setCart((prev) => {
            const existing = prev.find((p) => p.id === item.id);
            if (existing) {
                return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const updateCartQty = (itemId: string, change: number) => {
        setCart((prev) =>
            prev
                .map((item) => (item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + change) } : item))
                .filter((item) => item.quantity > 0)
        );
    };

    const completeTransaction = async () => {
        if (!companyId || !selectedCamperId) return;
        if (!selectedIsStaff && !selectedCamper) {
            Alert.alert('Owl Pay', 'Select a camper first');
            return;
        }
        if (cart.length === 0) {
            Alert.alert('Owl Pay', 'Add at least one item');
            return;
        }
        if (!selectedIsStaff && wouldExceedOwlPayOverdraft(currentBalance, total)) {
            Alert.alert('Owl Pay', `Campers can go up to $${OWL_PAY_MAX_OVERDRAFT.toFixed(0)} negative.`);
            return;
        }

        setIsCompletingTransaction(true);
        try {
            const { data: authData } = await supabase.auth.getUser();
            const createdBy = authData.user?.id;
            const online = await isOnlineNow();

            let effectivePricing = cartPricing;
            if (!selectedIsStaff && cartPricing.freeItemApplied && companyId) {
                const stillFree = await isFreeDailyItemAvailableToday(
                    supabase,
                    companyId,
                    selectedCamperId,
                );
                if (!stillFree) {
                    effectivePricing = calculateOwlPayCartPricing(
                        cart.map((item) => ({
                            id: item.id,
                            name: item.name,
                            price: Number(item.price),
                            category: item.category,
                            quantity: item.quantity,
                        })),
                        { hasFreeDailyItemAvailable: false, isStaff: false },
                    );
                }
            }

            const effectiveTotal = effectivePricing.total;
            const effectiveNewBalance = calculateOwlPayNewBalance(
                currentBalance,
                effectiveTotal,
                selectedIsStaff,
            );

            if (!selectedIsStaff && wouldExceedOwlPayOverdraft(currentBalance, effectiveTotal)) {
                Alert.alert('Owl Pay', `Campers can go up to $${OWL_PAY_MAX_OVERDRAFT.toFixed(0)} negative.`);
                return;
            }

            const txRows = buildOwlPayPurchaseRows(
                cart.map((item) => ({
                    id: item.id,
                    name: item.name,
                    price: Number(item.price),
                    category: item.category,
                    quantity: item.quantity,
                })),
                effectivePricing,
                {
                    child_id: selectedIsStaff ? null : selectedCamperId,
                    staff_id: selectedIsStaff ? selectedCamperId : null,
                    company_id: companyId,
                    created_by: createdBy,
                }
            );

            const checkoutInput = {
                companyId,
                childId: selectedIsStaff ? null : selectedCamperId,
                staffId: selectedIsStaff ? selectedCamperId : null,
                createdBy,
                pricing: effectivePricing,
                transactions: txRows,
            };

            let checkoutResult = {
                charge_total: effectiveTotal,
                new_balance: selectedIsStaff ? null : effectiveNewBalance,
                free_item_applied: effectivePricing.freeItemApplied,
            };

            if (online) {
                checkoutResult = await completeOwlPayCheckout(supabase, checkoutInput);
            } else {
                await enqueueSync('owl_pay.checkout.complete', checkoutInput);
            }

            const finalBalance = selectedIsStaff
                ? effectiveNewBalance
                : checkoutResult.new_balance ?? effectiveNewBalance;

            if (online && cart.length > 0) {
                try {
                    await supabase.functions.invoke('send-owlpay-notifications', {
                        body: {
                            company_id: companyId,
                            transaction_type: 'purchase',
                            child_id: selectedIsStaff ? null : selectedCamperId,
                            staff_id: selectedIsStaff ? selectedCamperId : null,
                            amount: checkoutResult.charge_total,
                            new_balance: selectedIsStaff ? null : finalBalance,
                        },
                    });
                } catch (notifyErr) {
                    console.error('Owl Pay notification call failed:', notifyErr);
                }
            }

            // Defer so the Complete button press doesn't dismiss the modal on open.
            setTimeout(() => {
                setSuccessData({
                    camperName: selectedDisplayName || 'Selection',
                    chargedAmount: checkoutResult.charge_total,
                    newBalance: finalBalance,
                    freeItemApplied: checkoutResult.free_item_applied,
                    isStaff: selectedIsStaff,
                });
            }, 150);
            setCart([]);
            setSelectedCamperId(null);
            setSelectedCamperSnapshot(null);
            setSelectedIsStaff(false);
            setHasFreeDailyItemAvailable(false);
            queryClient.invalidateQueries({ queryKey: ['owlpay_campers'] });
            queryClient.invalidateQueries({ queryKey: ['owlpay_reports'] });
            focusScanInput();
        } catch (err: any) {
            Alert.alert('Owl Pay', err?.message || 'Transaction failed');
        } finally {
            setIsCompletingTransaction(false);
        }
    };

    useEffect(() => {
        return () => {
            if (scanResetTimeoutRef.current) {
                clearTimeout(scanResetTimeoutRef.current);
            }
            if (scanSubmitTimeoutRef.current) {
                clearTimeout(scanSubmitTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (activeTab !== 'pos') return;
        focusScanInput();
    }, [activeTab]);


    useEffect(() => {
        if (!settings) return;
        setLowBalanceAlertsEnabled(settings.low_balance_alerts_enabled);
        setStaffReportsEnabled(settings.staff_purchase_reports_enabled);
        setStaffReportFrequency(settings.staff_report_frequency || 'daily');
        setLowBalanceThreshold(String(settings.low_balance_threshold ?? 5));
        setLowBalanceRecipientEmail(settings.low_balance_recipient_email ?? '');
        setStaffReportRecipientEmail(settings.staff_report_recipient_email ?? '');
    }, [
        settings?.low_balance_alerts_enabled,
        settings?.staff_purchase_reports_enabled,
        settings?.staff_report_frequency,
        settings?.low_balance_threshold,
        settings?.low_balance_recipient_email,
        settings?.staff_report_recipient_email,
    ]);

    const saveSettings = () => {
        if (!companyId) return;
        const parsedThreshold = Number(lowBalanceThreshold);
        const payload: OwlPayEmailConfig = {
            company_id: companyId,
            low_balance_alerts_enabled: lowBalanceAlertsEnabled,
            low_balance_threshold: Number.isFinite(parsedThreshold) ? parsedThreshold : 5,
            low_balance_recipient_email: lowBalanceRecipientEmail.trim() || null,
            staff_purchase_reports_enabled: staffReportsEnabled,
            staff_report_frequency: staffReportFrequency,
            staff_report_recipient_email: staffReportRecipientEmail.trim() || null,
        };
        saveSettingsMutation.mutate(payload, {
            onSuccess: () => Alert.alert('Owl Pay', 'Settings saved successfully'),
            onError: (err: any) => Alert.alert('Owl Pay', err?.message || 'Failed to save settings'),
        });
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.openDrawer()}>
                <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.headerIconBtn}>
                    <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn}>
                    <Ionicons name="person-outline" size={22} color={theme.colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTitle = () => (
        <View style={styles.titleSection}>
            <View style={styles.brandRow}>
                <Text style={styles.logoIcon}>🦉</Text>
                <Text style={styles.title}>Owl Pay</Text>
            </View>
            <Text style={styles.subtitle}>Point-of-sale canteen system with RFID scanning</Text>
        </View>
    );

    const renderTabs = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {tabs.map((tab) => {
                const active = tab.key === activeTab;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={[styles.tabButton, active && styles.tabButtonActive]}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={16}
                            color={active ? theme.colors.secondary : theme.colors.textSecondary}
                        />
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );

    const renderPOS = () => (
        <View style={[styles.posLayout, isWidePos && styles.posLayoutWide]}>
            <View style={isWidePos ? styles.posLeftColumn : undefined}>
            <StyledCard style={styles.posListContainer}>
                <View style={styles.searchInputWrap}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                    <TextInput
                        ref={scanInputRef}
                        value={camperQuery}
                        onChangeText={handleCamperQueryChange}
                        onSubmitEditing={() => {
                            if (camperQuery.trim()) {
                                void processRfidScan(camperQuery);
                            }
                        }}
                        placeholder="Scan RFID or search name..."
                        placeholderTextColor={theme.colors.textSecondary}
                        style={styles.searchInput}
                        showSoftInputOnFocus={false}
                        autoCorrect={false}
                        autoCapitalize="none"
                        blurOnSubmit={false}
                        returnKeyType="done"
                        caretHidden={isWedgeScanning}
                    />
                    <TouchableOpacity
                        onPress={() => {
                            if (camperQuery.trim()) {
                                void processRfidScan(camperQuery);
                            } else {
                                focusScanInput();
                            }
                        }}
                        accessibilityLabel="Process RFID scan"
                    >
                        <Ionicons
                            name={
                                scanStatus === 'success'
                                    ? 'checkmark-circle'
                                    : scanStatus === 'error'
                                      ? 'close-circle'
                                      : 'scan-outline'
                            }
                            size={18}
                            color={
                                scanStatus === 'success'
                                    ? theme.colors.success
                                    : scanStatus === 'error'
                                      ? '#dc2626'
                                      : theme.colors.secondary
                            }
                        />
                    </TouchableOpacity>
                </View>
                <Text
                    style={[
                        styles.scanStatusText,
                        scanStatus === 'success'
                            ? styles.scanStatusSuccess
                            : scanStatus === 'error'
                              ? styles.scanStatusError
                              : undefined,
                    ]}
                >
                    {scanStatusLabel}
                </Text>
                {!isWedgeScanning && camperQuery.trim().length > 0 && (
                    <Text style={styles.scanHintText}>Type a name to filter the list, or scan a wristband.</Text>
                )}

                <Text style={styles.posSectionLabel}>Campers</Text>
                <ScrollView style={[styles.camperList, isWidePos && styles.camperListWide]} contentContainerStyle={styles.camperListContent}>
                    {campersLoading ? (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator size="small" color={theme.colors.secondary} />
                        </View>
                    ) : posCampers.length === 0 ? (
                        <Text style={styles.emptyStateText}>No campers match your search.</Text>
                    ) : posCampers.map((camper) => {
                        const isSelected = !selectedIsStaff && camper.id === selectedCamperId;
                        return (
                            <TouchableOpacity
                                key={camper.id}
                                style={[styles.camperCard, isSelected && styles.camperCardSelected]}
                                onPress={() => handleSelectCamper(camper.id)}
                            >
                                {(camper.photo_url && (
                                    <Image source={{ uri: camper.photo_url }} style={styles.avatarImage} />
                                )) || (
                                    <View style={styles.avatarCircle}>
                                        <Text style={styles.avatarInitials}>{getInitials(camper.name)}</Text>
                                    </View>
                                )}
                                <View style={styles.camperCardText}>
                                    <Text style={styles.camperName}>{camper.name}</Text>
                                    <Text style={styles.camperMetaText}>{camper.rfid || 'No RFID'}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.balancePill,
                                        (() => {
                                            const tone = getOwlPayBalanceTone(Number(camper.owl_pay_balance || 0));
                                            if (tone === 'negative' || tone === 'low') return styles.balancePillLow;
                                            if (tone === 'medium') return styles.balancePillMedium;
                                            return styles.balancePillHealthy;
                                        })(),
                                    ]}
                                >
                                    <Text style={styles.balancePillText}>{currency(Number(camper.owl_pay_balance || 0))}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={styles.posSectionLabel}>Staff (Running Tab)</Text>
                <ScrollView style={[styles.camperList, isWidePos && styles.camperListWide]} contentContainerStyle={styles.camperListContent}>
                    {staffLoading ? (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator size="small" color={theme.colors.secondary} />
                        </View>
                    ) : posStaff.length === 0 ? (
                        <Text style={styles.emptyStateText}>No staff match your search.</Text>
                    ) : posStaff.map((staff: OwlPayStaff) => {
                        const isSelected = selectedIsStaff && staff.id === selectedCamperId;
                        return (
                            <TouchableOpacity
                                key={staff.id}
                                style={[styles.camperCard, isSelected && styles.camperCardSelected]}
                                onPress={() => handleSelectStaff(staff.id)}
                            >
                                <View style={styles.avatarCircle}>
                                    <Ionicons name="briefcase-outline" size={18} color={theme.colors.secondary} />
                                </View>
                                <View style={styles.camperCardText}>
                                    <Text style={styles.camperName}>{staff.name}</Text>
                                    <Text style={styles.camperMetaText}>{staff.rfid || 'No RFID'}</Text>
                                </View>
                                <View style={styles.balancePill}>
                                    <Text style={styles.balancePillText}>Tab</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </StyledCard>
            </View>

            <View style={isWidePos ? styles.posRightColumn : undefined}>
            <StyledCard style={[styles.selectionCard, isWidePos && styles.selectionCardWide]}>
                <Ionicons name="wallet-outline" size={42} color={theme.colors.textSecondary} />
                <Text style={styles.selectionText}>
                    {selectedDisplayName ? `Selected: ${selectedDisplayName}` : 'Select a camper/staff to begin'}
                </Text>
                {hasFreeDailyItemAvailable && !selectedIsStaff && (
                    <Text style={styles.firstScanBadge}>1 free snack or drink available today</Text>
                )}
            </StyledCard>

            <StyledCard>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleWrap}>
                        <Ionicons name="fast-food-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>Quick Items</Text>
                    </View>
                </View>
                <View style={styles.quickItemWrap}>
                    {itemsLoading ? (
                        <View style={styles.emptyStateBox}>
                            <ActivityIndicator size="small" color={theme.colors.secondary} />
                        </View>
                    ) : posActiveItems.length === 0 ? (
                        <View style={styles.emptyStateBox}>
                            <Text style={styles.emptyStateText}>
                                No active canteen items. Add items on the Items tab.
                            </Text>
                        </View>
                    ) : (
                    posActiveItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.quickItemBtn}
                            onPress={() => addToCart(item)}
                            disabled={!selectedCamperId}
                        >
                            <Text style={styles.quickItemName}>{item.name}</Text>
                            <Text style={styles.quickItemPrice}>{currency(Number(item.price))}</Text>
                            {cart.some((c) => c.id === item.id) && (
                                <Text style={styles.quickItemQtyBadge}>
                                    x{cart.find((c) => c.id === item.id)?.quantity || 1}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))
                    )}
                </View>
            </StyledCard>

            <StyledCard>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleWrap}>
                        <Ionicons name="receipt-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>Transaction</Text>
                    </View>
                </View>
                {cart.length === 0 ? (
                    <Text style={styles.emptyStateText}>No items added yet.</Text>
                ) : (
                    <View style={styles.itemsList}>
                        {cart.map((item) => (
                            <View key={item.id} style={styles.itemRowMain}>
                                <View>
                                    <Text style={styles.itemName}>
                                        {item.name}
                                        {cartPricing.freeItemLineId === item.id && cartPricing.freeItemApplied
                                            ? ' (1 free)'
                                            : ''}
                                    </Text>
                                    <Text style={styles.itemMeta}>{currency(Number(item.price))} each</Text>
                                </View>
                                <View style={styles.qtyControlRow}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.id, -1)}>
                                        <Ionicons name="remove" size={16} color={theme.colors.text} />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.id, 1)}>
                                        <Ionicons name="add" size={16} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.totalsBox}>
                    <Text style={styles.totalsLine}>Subtotal: {currency(subtotal)}</Text>
                    {freeDiscount > 0 && (
                        <Text style={[styles.totalsLine, styles.freeDiscountText]}>
                            Free daily item: -{currency(freeDiscount)}
                        </Text>
                    )}
                    <Text style={styles.totalsLine}>Total: {currency(total)}</Text>
                    {!selectedIsStaff && selectedCamper && (
                        <Text
                            style={[
                                styles.totalsLine,
                                newBalanceTone === 'negative' || newBalanceTone === 'low'
                                    ? styles.balanceTextLow
                                    : newBalanceTone === 'medium'
                                      ? styles.balanceTextMedium
                                      : styles.balanceTextHealthy,
                            ]}
                        >
                            New Balance: {currency(newBalance)}
                        </Text>
                    )}
                    {selectedIsStaff && selectedStaff && <Text style={styles.totalsLine}>Staff Running Tab</Text>}
                    {exceedsOverdraft && (
                        <Text style={styles.insufficientFundsText}>
                            Exceeds ${OWL_PAY_MAX_OVERDRAFT.toFixed(0)} credit limit
                        </Text>
                    )}
                    {!exceedsOverdraft && formatOwlPayBalanceHint(newBalance) && (
                        <Text style={styles.insufficientFundsText}>{formatOwlPayBalanceHint(newBalance)}</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.primarySaveButton, (!selectedCamperId || isCompletingTransaction || exceedsOverdraft) && { opacity: 0.6 }]}
                    onPress={completeTransaction}
                    disabled={!selectedCamperId || isCompletingTransaction || exceedsOverdraft}
                >
                    <Text style={styles.primaryButtonText}>
                        {isCompletingTransaction ? 'Processing...' : 'Complete Transaction'}
                    </Text>
                </TouchableOpacity>
            </StyledCard>
            </View>
        </View>
    );

    const renderItems = () => (
        <StyledCard>
            <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWrap}>
                    <Ionicons name="cube-outline" size={20} color={theme.colors.text} />
                    <Text style={styles.sectionTitle}>Canteen Items</Text>
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setShowAddItemModal(true)}>
                    <Ionicons name="add-outline" size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>Add Item</Text>
                </TouchableOpacity>
            </View>

            {itemsLoading ? (
                <View style={styles.emptyStateBox}>
                    <ActivityIndicator size="small" color={theme.colors.secondary} />
                </View>
            ) : allItems.length === 0 ? (
                <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateText}>No items yet. Add your first canteen item!</Text>
                </View>
            ) : (
                <View style={styles.itemsList}>
                    {allItems.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View style={styles.itemRowMain}>
                                <View>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemMeta}>{item.category}</Text>
                                </View>
                                <View style={styles.itemRowActions}>
                                    <Text style={styles.itemPrice}>{currency(Number(item.price))}</Text>
                                    <TouchableOpacity
                                        accessibilityLabel={`Delete ${item.name}`}
                                        onPress={() => {
                                            setItemToDelete(item);
                                            setIsDeleteConfirmVisible(true);
                                        }}
                                        style={styles.itemDeleteBtn}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#dc2626" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </StyledCard>
    );

    const renderBalances = () => (
        <>
            <StyledCard>
                <View style={styles.reportFilterRow}>
                    <Text style={styles.rangeButtonText}>View:</Text>
                    <TouchableOpacity
                        style={[styles.rangeButton, balanceAudience === 'campers' && styles.rangeButtonActive]}
                        onPress={() => setBalanceAudience('campers')}
                    >
                        <Text style={[styles.rangeButtonText, balanceAudience === 'campers' && styles.rangeButtonTextActive]}>
                            Campers
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.rangeButton, balanceAudience === 'staff' && styles.rangeButtonActive]}
                        onPress={() => setBalanceAudience('staff')}
                    >
                        <Text style={[styles.rangeButtonText, balanceAudience === 'staff' && styles.rangeButtonTextActive]}>
                            Staff
                        </Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            {balanceAudience === 'campers' ? (
                <View style={styles.statsGrid}>
                    <StyledCard style={styles.statCard}>
                        <Text style={styles.statLabel}>Total campers</Text>
                        <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{campers.length}</Text>
                    </StyledCard>
                    <StyledCard style={styles.statCard}>
                        <Text style={styles.statLabel}>Total balance</Text>
                        <Text style={[styles.statValue, { color: theme.colors.success }]}>{currency(totalBalance)}</Text>
                    </StyledCard>
                    <StyledCard style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg balance</Text>
                        <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{currency(averageBalance)}</Text>
                    </StyledCard>
                </View>
            ) : (
                <View style={styles.statsGrid}>
                    <StyledCard style={styles.statCard}>
                        <Text style={styles.statLabel}>Total staff</Text>
                        <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{staffSpendRows.length}</Text>
                    </StyledCard>
                    <StyledCard style={styles.statCard}>
                        <Text style={styles.statLabel}>Total POS spend</Text>
                        <Text style={[styles.statValue, { color: theme.colors.success }]}>{currency(totalStaffSpendAll)}</Text>
                    </StyledCard>
                    <StyledCard style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg per staff</Text>
                        <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
                            {currency(avgStaffSpendDisplay)}
                        </Text>
                    </StyledCard>
                </View>
            )}

            <StyledCard>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleWrap}>
                        <Ionicons name="cash-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>
                            {balanceAudience === 'campers' ? 'Camper balances' : 'Staff POS totals'}
                        </Text>
                    </View>
                </View>
                <View style={styles.searchInputWrap}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                    <TextInput
                        value={balanceSearch}
                        onChangeText={setBalanceSearch}
                        placeholder={balanceAudience === 'campers' ? 'Search campers…' : 'Search staff…'}
                        placeholderTextColor={theme.colors.textSecondary}
                        style={styles.searchInput}
                    />
                </View>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.3 }]}>Person ID</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: 'right' }]}>
                        {balanceAudience === 'campers' ? 'Balance' : 'Spend'}
                    </Text>
                </View>
                <ScrollView style={styles.balancesList} contentContainerStyle={styles.balancesListContent}>
                    {balanceAudience === 'campers' ? (
                        campersLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.secondary} style={{ marginVertical: 16 }} />
                        ) : (
                            campers.map((camper) => (
                                <View key={camper.id} style={styles.tableRow}>
                                    <Text style={[styles.tableText, { flex: 2 }]}>{camper.name}</Text>
                                    <Text style={[styles.tableText, { flex: 1.3 }]}>{camper.person_id || '-'}</Text>
                                    <View style={styles.tableBalancePill}>
                                        <Text style={styles.tableBalancePillText}>
                                            {currency(Number(camper.owl_pay_balance || 0))}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )
                    ) : staffSpendLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.secondary} style={{ marginVertical: 16 }} />
                    ) : (
                        staffSpendRows.map((s) => (
                            <View key={s.id} style={styles.tableRow}>
                                <Text style={[styles.tableText, { flex: 2 }]}>{s.name}</Text>
                                <Text style={[styles.tableText, { flex: 1.3 }]}>{s.person_id || '-'}</Text>
                                <View style={styles.tableBalancePill}>
                                    <Text style={styles.tableBalancePillText}>{currency(s.total_spent)}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
                {balanceAudience === 'staff' && (
                    <Text style={styles.settingHintText}>Totals sum all OwlPay staff purchases for this camp.</Text>
                )}
            </StyledCard>
        </>
    );

    const renderReports = () => (
        <>
            <StyledCard>
                <View style={styles.reportFilterRow}>
                    {(['Today', 'This Week', 'This Month', 'All Time'] as const).map((label) => (
                        <TouchableOpacity
                            key={label}
                            style={[styles.rangeButton, reportsRange === label && styles.rangeButtonActive]}
                            onPress={() => setReportsRange(label)}
                        >
                            <Text style={[styles.rangeButtonText, reportsRange === label && styles.rangeButtonTextActive]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.reportDateRow}>
                    <Text style={styles.dateChip}>
                        {reportRangeYmd.fromYmd} - {reportRangeYmd.toYmd} (camp time)
                    </Text>
                </View>
                <View style={[styles.reportFilterRow, { marginTop: 12 }]}>
                    <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>Purchasers:</Text>
                    {(['all', 'campers', 'staff'] as const).map((a) => (
                        <TouchableOpacity
                            key={a}
                            style={[styles.rangeButton, reportAudience === a && styles.rangeButtonActive]}
                            onPress={() => setReportAudience(a)}
                        >
                            <Text style={[styles.rangeButtonText, reportAudience === a && styles.rangeButtonTextActive]}>
                                {a === 'all' ? 'All' : a === 'campers' ? 'Campers' : 'Staff'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={[styles.primaryButton, { marginLeft: 'auto', flexShrink: 1 }]} onPress={exportReportsCsv}>
                        <Ionicons name="download-outline" size={16} color="#fff" />
                        <Text style={styles.primaryButtonText}>CSV</Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            <View style={styles.statsGrid}>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Revenue</Text>
                    <Text style={styles.statValue}>{currency(reportsData?.totalRevenue || 0)}</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Items sold</Text>
                    <Text style={styles.statValue}>{reportsData?.totalItems || 0}</Text>
                    {(reportsData?.freeItems || 0) > 0 && (
                        <Text style={styles.statHint}>{reportsData?.freeItems} free daily</Text>
                    )}
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Most popular</Text>
                    <Text style={styles.statValue} numberOfLines={2}>
                        {reportsData?.mostPopular || 'N/A'}
                    </Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Avg transaction</Text>
                    <Text style={styles.statValue}>{currency(reportsData?.avgTransaction || 0)}</Text>
                </StyledCard>
            </View>

            <StyledCard>
                <View style={styles.reportFilterRow}>
                    {(
                        [
                            { key: 'by-item' as const, label: 'By Item' },
                            { key: 'by-person' as const, label: 'By Person' },
                            { key: 'over-time' as const, label: 'Over Time' },
                            { key: 'purchases' as const, label: 'Purchases' },
                        ] as const
                    ).map(({ key, label }) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.rangeButton, reportsSubTab === key && styles.rangeButtonActive]}
                            onPress={() => setReportsSubTab(key)}
                        >
                            <Text style={[styles.rangeButtonText, reportsSubTab === key && styles.rangeButtonTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {reportsLoading ? (
                    <View style={styles.emptyStateBox}>
                        <ActivityIndicator size="small" color={theme.colors.secondary} />
                    </View>
                ) : reportsSubTab === 'by-item' ? (
                    (reportsData?.salesByItem?.length || 0) === 0 ? (
                        <Text style={styles.emptyStateText}>No sales for this period.</Text>
                    ) : (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Item</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cat</Text>
                                <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Qty</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>$</Text>
                            </View>
                            <ScrollView style={{ maxHeight: 360 }}>
                                {reportsData!.salesByItem.map((item) => (
                                    <View key={item.id} style={styles.tableRow}>
                                        <Text style={[styles.tableText, { flex: 2 }]}>{item.name}</Text>
                                        <Text style={[styles.tableText, { flex: 1 }]}>{item.category}</Text>
                                        <Text style={[styles.tableText, { flex: 0.8, textAlign: 'right' }]}>{item.quantity}</Text>
                                        <Text style={[styles.tableText, { flex: 1, textAlign: 'right' }]}>
                                            {currency(item.revenue)}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )
                ) : reportsSubTab === 'by-person' ? (
                    (reportsData?.buyerSummaries?.length || 0) === 0 ? (
                        <Text style={styles.emptyStateText}>No paid purchases for this period.</Text>
                    ) : (
                        <>
                            <Text style={styles.settingHintText}>
                                Full balance = deposits minus season spend. New purchases stop at −$75 credit limit.
                            </Text>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>Name</Text>
                                {reportAudience === 'all' && (
                                    <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>Type</Text>
                                )}
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Spent</Text>
                                {reportAudience !== 'staff' && (
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Dep.</Text>
                                )}
                                {reportAudience !== 'staff' && (
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Bal.</Text>
                                )}
                            </View>
                            <ScrollView style={{ maxHeight: 400 }}>
                                {reportsData!.buyerSummaries.map((s) => (
                                    <View key={s.buyer_key} style={styles.tableRow}>
                                        <Text style={[styles.tableText, { flex: 1.4 }]} numberOfLines={1}>
                                            {s.name}
                                        </Text>
                                        {reportAudience === 'all' && (
                                            <Text style={[styles.tableText, { flex: 0.7, fontSize: 11 }]}>{s.buyer_type}</Text>
                                        )}
                                        <Text style={[styles.tableText, { flex: 1, textAlign: 'right' }]}>
                                            {currency(s.period_spent)}
                                        </Text>
                                        {reportAudience !== 'staff' && (
                                            <Text style={[styles.tableText, { flex: 1, textAlign: 'right', fontSize: 11 }]}>
                                                {s.cm_deposits != null ? currency(s.cm_deposits) : '—'}
                                            </Text>
                                        )}
                                        {reportAudience !== 'staff' && (
                                            <Text
                                                style={[
                                                    styles.tableText,
                                                    {
                                                        flex: 1,
                                                        textAlign: 'right',
                                                        fontSize: 11,
                                                        color:
                                                            s.full_balance != null && s.full_balance < 0
                                                                ? theme.colors.danger
                                                                : s.current_balance != null && s.current_balance < 0
                                                                  ? theme.colors.danger
                                                                  : theme.colors.text,
                                                    },
                                                ]}
                                            >
                                                {s.full_balance != null
                                                    ? currency(s.full_balance)
                                                    : s.current_balance != null
                                                      ? currency(s.current_balance)
                                                      : '—'}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )
                ) : reportsSubTab === 'over-time' ? (
                    (reportsData?.salesOverTime?.length || 0) === 0 ? (
                        <Text style={styles.emptyStateText}>No data for this period.</Text>
                    ) : (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Date</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Txns</Text>
                            </View>
                            <ScrollView style={{ maxHeight: 360 }}>
                                {reportsData!.salesOverTime.map((row) => (
                                    <View key={row.date} style={styles.tableRow}>
                                        <Text style={[styles.tableText, { flex: 1.2 }]}>{row.date}</Text>
                                        <Text style={[styles.tableText, { flex: 1, textAlign: 'right' }]}>
                                            {currency(row.revenue)}
                                        </Text>
                                        <Text style={[styles.tableText, { flex: 1, textAlign: 'right' }]}>{row.count}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )
                ) : (
                    <>
                        <View style={styles.searchInputWrap}>
                            <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                            <TextInput
                                value={reportSearch}
                                onChangeText={setReportSearch}
                                placeholder="Search name or item…"
                                placeholderTextColor={theme.colors.textSecondary}
                                style={styles.searchInput}
                            />
                        </View>
                        {(reportsData?.purchases?.length || 0) === 0 ? (
                            <Text style={styles.emptyStateText}>No purchases for this period.</Text>
                        ) : (
                            <>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHeaderText, { flex: 1.1 }]}>When</Text>
                                    {reportAudience === 'all' && (
                                        <Text style={[styles.tableHeaderText, { flex: 0.6 }]}>Type</Text>
                                    )}
                                    <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>Who</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Item</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 0.7, textAlign: 'right' }]}>$</Text>
                                </View>
                                <ScrollView style={{ maxHeight: 400 }}>
                                    {reportsData!.purchases.map((p: any) => (
                                        <View key={p.id} style={styles.tableRow}>
                                            <Text style={[styles.tableText, { flex: 1.1, fontSize: 11 }]}>
                                                {formatCampReportDateTime(p.purchased_at)}
                                            </Text>
                                            {reportAudience === 'all' && (
                                                <Text style={[styles.tableText, { flex: 0.6, fontSize: 11 }]}>
                                                    {p.buyer_type}
                                                </Text>
                                            )}
                                            <Text style={[styles.tableText, { flex: 1.4 }]} numberOfLines={2}>
                                                {p.camper_name}
                                            </Text>
                                            <Text style={[styles.tableText, { flex: 1.2 }]} numberOfLines={2}>
                                                {p.item_name}
                                            </Text>
                                            <Text style={[styles.tableText, { flex: 0.7, textAlign: 'right' }]}>
                                                {p.is_free ? 'Free' : currency(p.amount)}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </>
                )}
            </StyledCard>
        </>
    );

    const renderSettings = () => (
        <>
            <StyledCard>
                <Text style={styles.sectionTitle}>Email settings</Text>
                <Text style={styles.settingSubtitle}>
                    Low-balance alerts apply to campers; staff reports summarize POS purchases by staff.
                </Text>
                <View style={[styles.reportFilterRow, { marginTop: 12 }]}>
                    <TouchableOpacity
                        style={[styles.rangeButton, settingsAudience === 'campers' && styles.rangeButtonActive]}
                        onPress={() => setSettingsAudience('campers')}
                    >
                        <Text style={[styles.rangeButtonText, settingsAudience === 'campers' && styles.rangeButtonTextActive]}>
                            Campers
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.rangeButton, settingsAudience === 'staff' && styles.rangeButtonActive]}
                        onPress={() => setSettingsAudience('staff')}
                    >
                        <Text style={[styles.rangeButtonText, settingsAudience === 'staff' && styles.rangeButtonTextActive]}>Staff</Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            {settingsAudience === 'campers' ? (
                <StyledCard>
                    <View style={styles.settingHeader}>
                        <Ionicons name="alert-circle-outline" size={22} color="#dc2626" />
                        <View style={styles.settingHeaderTextWrap}>
                            <Text style={styles.sectionTitle}>Low Balance Alerts</Text>
                            <Text style={styles.settingSubtitle}>
                                Send an email when a camper balance drops below a threshold after a purchase.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Enable Low Balance Alerts</Text>
                        <TouchableOpacity
                            style={[styles.toggle, lowBalanceAlertsEnabled && styles.toggleOn]}
                            onPress={() => setLowBalanceAlertsEnabled((prev) => !prev)}
                        >
                            <View style={[styles.toggleKnob, lowBalanceAlertsEnabled && styles.toggleKnobOn]} />
                        </TouchableOpacity>
                    </View>
                    {lowBalanceAlertsEnabled && (
                        <View style={styles.settingInputsWrap}>
                            <Text style={styles.settingFieldLabel}>Balance Threshold ($)</Text>
                            <TextInput
                                value={lowBalanceThreshold}
                                onChangeText={setLowBalanceThreshold}
                                keyboardType="decimal-pad"
                                style={styles.settingInput}
                                placeholder="5"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            <Text style={styles.settingHintText}>
                                Alert triggers when balance falls below this amount.
                            </Text>

                            <Text style={styles.settingFieldLabel}>Recipient Email</Text>
                            <TextInput
                                value={lowBalanceRecipientEmail}
                                onChangeText={setLowBalanceRecipientEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={styles.settingInput}
                                placeholder="admin@camp.com"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            <Text style={styles.settingHintText}>
                                Leave blank to send to the camper&apos;s guardian email on file.
                            </Text>
                        </View>
                    )}
                </StyledCard>
            ) : (
                <StyledCard>
                    <View style={styles.settingHeader}>
                        <Ionicons name="document-text-outline" size={22} color={theme.colors.secondary} />
                        <View style={styles.settingHeaderTextWrap}>
                            <Text style={styles.sectionTitle}>Staff Purchase Reports</Text>
                            <Text style={styles.settingSubtitle}>
                                Send periodic reports summarizing staff purchases to an administrator.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Enable Staff Reports</Text>
                        <TouchableOpacity
                            style={[styles.toggle, staffReportsEnabled && styles.toggleOn]}
                            onPress={() => setStaffReportsEnabled((prev) => !prev)}
                        >
                            <View style={[styles.toggleKnob, staffReportsEnabled && styles.toggleKnobOn]} />
                        </TouchableOpacity>
                    </View>
                    {staffReportsEnabled && (
                        <View style={styles.settingInputsWrap}>
                            <Text style={styles.settingFieldLabel}>Report Frequency</Text>
                            <View style={styles.frequencyRow}>
                                {(['daily', 'weekly', 'monthly'] as const).map((freq) => {
                                    const isActive = staffReportFrequency === freq;
                                    return (
                                        <TouchableOpacity
                                            key={freq}
                                            style={[styles.frequencyBtn, isActive && styles.frequencyBtnActive]}
                                            onPress={() => setStaffReportFrequency(freq)}
                                        >
                                            <Text style={[styles.frequencyBtnText, isActive && styles.frequencyBtnTextActive]}>
                                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.settingFieldLabel}>Recipient Email</Text>
                            <TextInput
                                value={staffReportRecipientEmail}
                                onChangeText={setStaffReportRecipientEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={styles.settingInput}
                                placeholder="director@camp.com"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            <Text style={styles.settingHintText}>
                                Who should receive the staff purchase summary.
                            </Text>
                        </View>
                    )}
                </StyledCard>
            )}

            <View style={styles.saveRow}>
                <TouchableOpacity style={styles.primarySaveButton} onPress={saveSettings} disabled={saveSettingsMutation.isPending || settingsLoading}>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}</Text>
                </TouchableOpacity>
                <View style={styles.infoChip}>
                    <Ionicons name="mail-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.infoChipText}>Emails sent via camp's configured email system</Text>
                </View>
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {renderHeader()}
                {renderTitle()}
                {renderTabs()}

                {activeTab === 'pos' && renderPOS()}
                {activeTab === 'items' && renderItems()}
                {activeTab === 'balances' && renderBalances()}
                {activeTab === 'reports' && renderReports()}
                {activeTab === 'settings' && renderSettings()}
            </ScrollView>


            <Modal visible={showAddItemModal} transparent animationType="fade" onRequestClose={() => setShowAddItemModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowAddItemModal(false)}>
                    <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Canteen Item</Text>
                            <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
                                <Ionicons name="close-outline" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput
                            value={itemForm.name}
                            onChangeText={(v) => setItemForm((prev) => ({ ...prev, name: v }))}
                            style={styles.input}
                            placeholder=""
                        />

                        <Text style={styles.inputLabel}>Price ($)</Text>
                        <TextInput
                            value={itemForm.price}
                            onChangeText={(v) => setItemForm((prev) => ({ ...prev, price: v }))}
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder=""
                        />

                        <Text style={styles.inputLabel}>Category</Text>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryDropdown((prev) => !prev)}>
                            <Text style={styles.dropdownText}>{itemForm.category}</Text>
                            <Ionicons name="chevron-down-outline" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {showCategoryDropdown && (
                            <View style={styles.dropdownMenu}>
                                {(['Food', 'Snacks', 'Drinks', 'Other'] as const).map((option) => {
                                    const selected = itemForm.category === option;
                                    return (
                                        <TouchableOpacity
                                            key={option}
                                            style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                                            onPress={() => {
                                                setItemForm((prev) => ({ ...prev, category: option }));
                                                setShowCategoryDropdown(false);
                                            }}
                                        >
                                            {selected ? (
                                                <Ionicons name="checkmark" size={16} color="#fff" />
                                            ) : (
                                                <View style={{ width: 16 }} />
                                            )}
                                            <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                            <Text style={styles.addItemButtonText}>Add Item</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={!!firstScanCamper}
                transparent
                animationType="fade"
                onRequestClose={() => {}}
            >
                <Pressable style={styles.modalOverlay} onPress={() => {}}>
                    <Pressable style={styles.successCard} onPress={(e) => e.stopPropagation()}>
                        {(firstScanCamper?.photo_url && (
                            <Image source={{ uri: firstScanCamper.photo_url }} style={styles.avatarImageLarge} />
                        )) || (
                            <View style={styles.avatarCircleLarge}>
                                <Text style={styles.avatarInitialsLarge}>{getInitials(firstScanCamper?.name)}</Text>
                            </View>
                        )}
                        <Text style={styles.successTitle}>{firstScanCamper?.name}</Text>
                        <Text style={styles.successSubtext}>Free daily canteen item</Text>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={!!successData}
                transparent
                animationType="fade"
                onRequestClose={() => {}}
            >
                <Pressable style={styles.modalOverlay} onPress={() => {}}>
                    <Pressable style={styles.successCard} onPress={(e) => e.stopPropagation()}>
                        <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                        <Text style={styles.successTitle}>{successData?.camperName}</Text>
                        {successData?.freeItemApplied && (successData?.chargedAmount || 0) === 0 ? (
                            <Text style={styles.successSubtext}>Free daily snack or drink applied</Text>
                        ) : (
                            <Text style={styles.successSubtext}>
                                Charged: {currency(successData?.chargedAmount || 0)}
                                {successData?.freeItemApplied ? ' (includes 1 free item)' : ''}
                            </Text>
                        )}
                        {!successData?.isStaff && (
                            <Text style={styles.successBalance}>
                                New Balance: {currency(successData?.newBalance || 0)}
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => {
                                setSuccessData(null);
                                focusScanInput();
                            }}
                        >
                            <Text style={styles.primaryButtonText}>Done</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={isDeleteConfirmVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!isDeleting) {
                        setIsDeleteConfirmVisible(false);
                        setItemToDelete(null);
                    }
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        if (!isDeleting) {
                            setIsDeleteConfirmVisible(false);
                            setItemToDelete(null);
                        }
                    }}
                >
                    <Pressable style={styles.deleteConfirmCard} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.deleteConfirmTitle}>Delete item?</Text>
                        <Text style={styles.deleteConfirmMessage}>
                            {itemToDelete
                                ? `Remove "${itemToDelete.name}" from canteen items? This cannot be undone.`
                                : ''}
                        </Text>
                        <View style={styles.deleteConfirmActions}>
                            {isDeleting ? (
                                <ActivityIndicator size="small" color={theme.colors.secondary} style={styles.deleteConfirmSpinner} />
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.deleteConfirmCancel}
                                        onPress={() => {
                                            setIsDeleteConfirmVisible(false);
                                            setItemToDelete(null);
                                        }}
                                    >
                                        <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.deleteConfirmDanger} onPress={confirmDeleteOwlPayItem}>
                                        <Text style={styles.deleteConfirmDangerText}>Delete</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.md, paddingBottom: 100 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleSection: { marginBottom: theme.spacing.sm },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logoIcon: { fontSize: 28 },
    title: { ...theme.typography.h1, fontSize: 42, marginBottom: 2 },
    subtitle: { ...theme.typography.bodySmall, fontSize: 20, color: theme.colors.textSecondary, marginTop: 2 },
    tabRow: { gap: 8, paddingVertical: 8, marginBottom: theme.spacing.md },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#eef2f7',
    },
    tabButtonActive: {
        borderColor: theme.colors.secondary,
        backgroundColor: '#ffffff',
    },
    tabText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600' },
    tabTextActive: { color: theme.colors.secondary },
    posLayout: { gap: theme.spacing.md },
    posLayoutWide: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
    },
    posLeftColumn: { flex: 1, minWidth: 0 },
    posRightColumn: { flex: 1.15, minWidth: 0, gap: theme.spacing.md },
    posListContainer: { marginBottom: 0 },
    posSectionLabel: {
        marginTop: 12,
        marginBottom: 6,
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    searchInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 10,
        backgroundColor: theme.colors.surface,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 8,
        color: theme.colors.text,
        fontSize: 14,
    },
    camperList: {
        maxHeight: 360,
        marginTop: 10,
    },
    camperListWide: {
        maxHeight: 520,
    },
    camperListContent: {
        paddingBottom: 4,
    },
    loaderWrap: {
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    camperCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: 10,
    },
    camperCardSelected: {
        borderColor: theme.colors.secondary,
        backgroundColor: '#eff6ff',
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarImage: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 10,
    },
    avatarInitials: { color: theme.colors.secondary, fontWeight: '700', fontSize: 12 },
    avatarCircleLarge: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarImageLarge: {
        width: 96,
        height: 96,
        borderRadius: 48,
        marginBottom: 12,
    },
    avatarInitialsLarge: { color: theme.colors.secondary, fontWeight: '700', fontSize: 28 },
    camperCardText: { flex: 1 },
    camperName: { fontSize: 16, color: theme.colors.text, fontWeight: '600' },
    camperMetaText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
    balancePill: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    balancePillLow: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
    balancePillMedium: { backgroundColor: '#fef9c3', borderColor: '#f59e0b' },
    balancePillHealthy: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
    balancePillText: { color: '#111827', fontWeight: '700', fontSize: 13 },
    scanStatusText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 },
    scanHintText: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 4 },
    scanStatusSuccess: { color: '#16a34a' },
    scanStatusError: { color: '#dc2626' },
    selectionCard: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        gap: 10,
    },
    selectionCardWide: {
        minHeight: 120,
    },
    selectionText: { color: theme.colors.textSecondary, fontSize: 20, textAlign: 'center' },
    firstScanBadge: {
        marginTop: 8,
        color: theme.colors.success,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    freeDiscountText: {
        color: theme.colors.success,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { ...theme.typography.h3, fontSize: 22 },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1d4ed8',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    emptyStateBox: {
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    emptyStateText: { color: theme.colors.textSecondary, fontSize: 15 },
    itemsList: { gap: 8 },
    itemRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    itemRowMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemRowActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    quickItemWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickItemBtn: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    quickItemName: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
    quickItemPrice: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
    quickItemQtyBadge: {
        marginTop: 4,
        color: '#1d4ed8',
        fontWeight: '700',
        fontSize: 11,
    },
    qtyControlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    qtyText: { minWidth: 20, textAlign: 'center', color: theme.colors.text, fontWeight: '700' },
    totalsBox: { marginTop: 12, marginBottom: 12, gap: 6 },
    totalsLine: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
    balanceTextLow: { color: '#dc2626' },
    balanceTextMedium: { color: '#b45309' },
    balanceTextHealthy: { color: '#16a34a' },
    insufficientFundsText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
    itemDeleteBtn: { padding: 6 },
    itemName: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
    itemMeta: { color: theme.colors.textSecondary, fontSize: 13 },
    itemPrice: { color: theme.colors.text, fontWeight: '700' },
    statsGrid: { gap: 10 },
    statCard: { marginBottom: 0 },
    statLabel: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 6 },
    statHint: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 4 },
    statValue: { color: theme.colors.text, fontSize: 34, fontWeight: '700' },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tableHeaderText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
    balancesList: {
        maxHeight: 360,
    },
    balancesListContent: {
        paddingBottom: 4,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#edf2f7',
        gap: 8,
    },
    tableText: { color: theme.colors.text, fontSize: 14 },
    tableBalancePill: {
        marginLeft: 'auto',
        backgroundColor: '#ef4444',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    tableBalancePillText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    reportFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    rangeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#eef2f7',
    },
    rangeButtonActive: { borderColor: theme.colors.secondary, backgroundColor: '#fff' },
    rangeButtonText: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
    rangeButtonTextActive: { color: theme.colors.secondary },
    reportDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    dateChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#eef2f7',
        color: theme.colors.textSecondary,
        fontSize: 13,
        flexShrink: 1,
    },
    customRangeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    customRangeText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    settingHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    settingHeaderTextWrap: { flex: 1 },
    settingSubtitle: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 2, lineHeight: 19 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    settingLabel: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
    settingInputsWrap: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: 8,
    },
    settingFieldLabel: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
    settingInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
        color: theme.colors.text,
    },
    settingHintText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: -2 },
    frequencyRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    frequencyBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#eef2f7',
    },
    frequencyBtnActive: { borderColor: theme.colors.secondary, backgroundColor: '#fff' },
    frequencyBtnText: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
    frequencyBtnTextActive: { color: theme.colors.secondary },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#cbd5e1',
        padding: 2,
    },
    toggleOn: { backgroundColor: '#1d4ed8' },
    toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    toggleKnobOn: { marginLeft: 20 },
    saveRow: { gap: 10 },
    primarySaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#1d4ed8',
        borderRadius: theme.borderRadius.md,
        paddingVertical: 12,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
    },
    infoChipText: { color: theme.colors.textSecondary, fontSize: 13 },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#1d4ed8',
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.card,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: { ...theme.typography.h3 },
    inputLabel: { color: theme.colors.text, fontWeight: '600', marginBottom: 6, marginTop: 6 },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    dropdown: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: { color: theme.colors.text, fontSize: 15 },
    dropdownMenu: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dropdownItemSelected: { backgroundColor: theme.colors.accent },
    dropdownItemText: { color: theme.colors.text, fontSize: 15 },
    dropdownItemTextSelected: { color: '#fff', fontWeight: '700' },
    addItemButton: {
        marginTop: 16,
        backgroundColor: '#1d4ed8',
        borderRadius: theme.borderRadius.md,
        paddingVertical: 12,
        alignItems: 'center',
    },
    addItemButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    deleteConfirmCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    deleteConfirmTitle: { ...theme.typography.h3, marginBottom: 8 },
    deleteConfirmMessage: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 21, marginBottom: 20 },
    deleteConfirmActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
    deleteConfirmSpinner: { alignSelf: 'center', paddingVertical: 8 },
    deleteConfirmCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    deleteConfirmCancelText: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
    deleteConfirmDanger: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#dc2626',
    },
    deleteConfirmDangerText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    successCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8,
    },
    successTitle: { ...theme.typography.h3, textAlign: 'center' },
    successSubtext: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center' },
    successBalance: { color: theme.colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
