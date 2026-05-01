import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { StyledCard } from '../components/StyledCard';
import { theme } from '../theme/theme';
import { useCompany } from '../contexts/CompanyContext';
import {
    OwlPayEmailConfig,
    OwlPayStaff,
    OwlPayItem,
    useOwlPayCampers,
    useOwlPayEmailConfig,
    useOwlPayItems,
    useOwlPayReports,
    useOwlPayStaff,
    useSaveOwlPayEmailConfig,
    useSaveOwlPayItem,
} from '../api/owlpay';
import { supabase } from '../lib/supabase';

type OwlPayTab = 'pos' | 'items' | 'balances' | 'reports' | 'settings';
type ItemCategory = 'Food' | 'Snacks' | 'Drinks' | 'Other';

const currency = (amount: number) => `$${amount.toFixed(2)}`;
const getInitials = (name?: string | null) =>
    (name || '')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

export const OwlPayScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<OwlPayTab>('pos');
    const [camperQuery, setCamperQuery] = useState('');
    const [selectedCamperId, setSelectedCamperId] = useState<string | null>(null);
    const [selectedIsStaff, setSelectedIsStaff] = useState(false);
    const [isFirstScanToday, setIsFirstScanToday] = useState(false);
    const [cart, setCart] = useState<Array<OwlPayItem & { quantity: number }>>([]);
    const [isCompletingTransaction, setIsCompletingTransaction] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'Snacks' as ItemCategory });
    const [reportsRange, setReportsRange] = useState<'Today' | 'This Week' | 'This Month' | 'All Time'>('All Time');
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
        isFirstScan: boolean;
        isStaff: boolean;
    } | null>(null);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [scanBuffer, setScanBuffer] = useState('');
    const [lastScanInputAt, setLastScanInputAt] = useState(0);
    const scanResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { companyId, season } = useCompany();
    const queryClient = useQueryClient();

    const tabs: { key: OwlPayTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: 'pos', label: 'POS', icon: 'cart-outline' },
        { key: 'items', label: 'Items', icon: 'cube-outline' },
        { key: 'balances', label: 'Balances', icon: 'cash-outline' },
        { key: 'reports', label: 'Reports', icon: 'bar-chart-outline' },
        { key: 'settings', label: 'Settings', icon: 'settings-outline' },
    ];

    const { data: campers = [], isLoading: campersLoading } = useOwlPayCampers(companyId, season, camperQuery);
    const { data: staffMembers = [], isLoading: staffLoading } = useOwlPayStaff(companyId, season, camperQuery);
    const { data: allItems = [], isLoading: itemsLoading } = useOwlPayItems(companyId, true);
    const { data: settings, isLoading: settingsLoading } = useOwlPayEmailConfig(companyId);
    const saveItemMutation = useSaveOwlPayItem();
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

    const reportRange = useMemo(() => {
        const now = new Date();
        const end = new Date(now);
        const start = new Date(now);
        if (reportsRange === 'Today') {
            start.setHours(0, 0, 0, 0);
        } else if (reportsRange === 'This Week') {
            const day = start.getDay();
            start.setDate(start.getDate() - day);
            start.setHours(0, 0, 0, 0);
        } else if (reportsRange === 'This Month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else {
            start.setFullYear(2020, 0, 1);
            start.setHours(0, 0, 0, 0);
        }
        return { start, end };
    }, [reportsRange]);

    const { data: reportsData, isLoading: reportsLoading } = useOwlPayReports(
        companyId,
        reportRange.start.toISOString(),
        reportRange.end.toISOString()
    );

    const selectedCamper = campers.find((c) => c.id === selectedCamperId) || null;
    const selectedStaff = selectedIsStaff ? staffMembers.find((s) => s.id === selectedCamperId) || null : null;
    const selectedDisplayName = selectedIsStaff ? selectedStaff?.name : selectedCamper?.name;
    const totalBalance = campers.reduce((sum, camper) => sum + Number(camper.owl_pay_balance || 0), 0);
    const averageBalance = campers.length ? totalBalance / campers.length : 0;
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const total = isFirstScanToday ? 0 : subtotal;
    const currentBalance = Number(selectedCamper?.owl_pay_balance || 0);
    const newBalance = selectedIsStaff ? currentBalance + total : currentBalance - total;
    const hasInsufficientFunds = !selectedIsStaff && !isFirstScanToday && cart.length > 0 && newBalance < 0;
    const scanStatusLabel =
        scanStatus === 'scanning'
            ? 'Reading scanner input...'
            : scanStatus === 'success'
              ? 'RFID matched successfully'
              : scanStatus === 'error'
                ? 'RFID not found'
                : 'Ready to scan RFID';

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
            const { error } = await supabase.from('owl_pay_items').delete().eq('id', itemToDelete.id);
            if (error) throw error;
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

    const checkFirstScanToday = async (childId: string) => {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('owl_pay_daily_scans')
            .select('id')
            .eq('child_id', childId)
            .eq('scan_date', today)
            .maybeSingle();
        if (error) throw error;
        return !data;
    };

    const handleSelectCamper = async (camperId: string) => {
        setSelectedCamperId(camperId);
        setSelectedIsStaff(false);
        setCart([]);
        try {
            const isFirst = await checkFirstScanToday(camperId);
            setIsFirstScanToday(isFirst);
        } catch (err: any) {
            setIsFirstScanToday(false);
            Alert.alert('Owl Pay', err?.message || 'Unable to check first scan status');
        }
    };

    const handleSelectStaff = (staffId: string) => {
        setSelectedCamperId(staffId);
        setSelectedIsStaff(true);
        setIsFirstScanToday(false);
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

    const selectByRFID = async (rfidRaw: string) => {
        const rfid = rfidRaw.trim().toLowerCase();
        if (!rfid) return false;

        const camperMatch = campers.find((c) => c.rfid?.toLowerCase() === rfid);
        if (camperMatch) {
            setScanStatus('success');
            await handleSelectCamper(camperMatch.id);
            setCamperQuery('');
            resetScanStatus(1000);
            return true;
        }

        const staffMatch = staffMembers.find((s) => s.rfid?.toLowerCase() === rfid);
        if (staffMatch) {
            setScanStatus('success');
            handleSelectStaff(staffMatch.id);
            setCamperQuery('');
            resetScanStatus(1000);
            return true;
        }

        setScanStatus('error');
        Alert.alert('RFID not found', `No camper or staff with RFID: ${rfidRaw}`);
        resetScanStatus(1800);
        return false;
    };

    const handleCamperQueryChange = (value: string) => {
        setCamperQuery(value);
        const now = Date.now();
        const timeDiff = now - lastScanInputAt;
        setLastScanInputAt(now);

        if (!value) {
            setScanStatus('idle');
            setScanBuffer('');
            return;
        }

        if (timeDiff < 100 && value.length > 1) {
            setScanStatus('scanning');
        }
        setScanBuffer(value);
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
        if (cart.length === 0 && !isFirstScanToday) {
            Alert.alert('Owl Pay', 'Add at least one item');
            return;
        }
        if (!selectedIsStaff && !isFirstScanToday && newBalance < 0) {
            Alert.alert('Owl Pay', 'Insufficient funds');
            return;
        }

        setIsCompletingTransaction(true);
        try {
            const { data: authData } = await supabase.auth.getUser();
            const createdBy = authData.user?.id;

            if (!selectedIsStaff && isFirstScanToday) {
                const { error: scanError } = await supabase.from('owl_pay_daily_scans').insert({
                    child_id: selectedCamperId,
                    company_id: companyId,
                });
                if (scanError) throw scanError;

                const { error: firstScanTxError } = await supabase.from('owl_pay_transactions').insert({
                    child_id: selectedCamperId,
                    staff_id: null,
                    company_id: companyId,
                    amount: 0,
                    is_free: true,
                    transaction_type: 'first_scan',
                    notes: 'First scan of the day - free entry',
                    created_by: createdBy,
                });
                if (firstScanTxError) throw firstScanTxError;
            }

            if (cart.length > 0) {
                const txRows = cart.flatMap((item) =>
                    Array(item.quantity)
                        .fill(null)
                        .map(() => ({
                            child_id: selectedIsStaff ? null : selectedCamperId,
                            staff_id: selectedIsStaff ? selectedCamperId : null,
                            company_id: companyId,
                            item_id: item.id,
                            amount: isFirstScanToday ? 0 : Number(item.price),
                            is_free: isFirstScanToday,
                            transaction_type: 'purchase',
                            created_by: createdBy,
                        }))
                );
                const { error: txError } = await supabase.from('owl_pay_transactions').insert(txRows);
                if (txError) throw txError;
            }

            if (!selectedIsStaff && selectedCamper && total !== 0) {
                const { error: balError } = await supabase.rpc('increment_camper_balance', {
                    _child_id: selectedCamper.id,
                    _amount: -total,
                });
                if (balError) throw balError;
            }

            if (cart.length > 0 && !isFirstScanToday) {
                try {
                    await supabase.functions.invoke('send-owlpay-notifications', {
                        body: {
                            company_id: companyId,
                            transaction_type: 'purchase',
                            child_id: selectedIsStaff ? null : selectedCamperId,
                            staff_id: selectedIsStaff ? selectedCamperId : null,
                            amount: total,
                            new_balance: selectedIsStaff ? null : newBalance,
                        },
                    });
                } catch (notifyErr) {
                    console.error('Owl Pay notification call failed:', notifyErr);
                }
            }

            setSuccessData({
                camperName: selectedDisplayName || 'Selection',
                chargedAmount: total,
                newBalance,
                isFirstScan: isFirstScanToday,
                isStaff: selectedIsStaff,
            });
            setCart([]);
            setSelectedCamperId(null);
            setSelectedIsStaff(false);
            setIsFirstScanToday(false);
            queryClient.invalidateQueries({ queryKey: ['owlpay_campers'] });
            queryClient.invalidateQueries({ queryKey: ['owlpay_reports'] });
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
        };
    }, []);

    useEffect(() => {
        if (!successData) return;
        const timer = setTimeout(() => setSuccessData(null), 2600);
        return () => clearTimeout(timer);
    }, [successData]);

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
        <View style={styles.posLayout}>
            <StyledCard style={styles.posListContainer}>
                <View style={styles.searchInputWrap}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                    <TextInput
                        value={camperQuery}
                        onChangeText={handleCamperQueryChange}
                        onSubmitEditing={() => {
                            if (scanBuffer.trim()) {
                                void selectByRFID(scanBuffer);
                            }
                        }}
                        placeholder="Scan RFID or search..."
                        placeholderTextColor={theme.colors.textSecondary}
                        style={styles.searchInput}
                    />
                    <TouchableOpacity
                        onPress={() => {
                            if (camperQuery.trim()) {
                                void selectByRFID(camperQuery);
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

                <Text style={styles.posSectionLabel}>Campers</Text>
                <ScrollView style={styles.camperList} contentContainerStyle={styles.camperListContent}>
                    {campersLoading ? (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator size="small" color={theme.colors.secondary} />
                        </View>
                    ) : campers.map((camper) => {
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
                                        Number(camper.owl_pay_balance || 0) < 5
                                            ? styles.balancePillLow
                                            : Number(camper.owl_pay_balance || 0) < 15
                                              ? styles.balancePillMedium
                                              : styles.balancePillHealthy,
                                    ]}
                                >
                                    <Text style={styles.balancePillText}>{currency(Number(camper.owl_pay_balance || 0))}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={styles.posSectionLabel}>Staff (Running Tab)</Text>
                <ScrollView style={styles.camperList} contentContainerStyle={styles.camperListContent}>
                    {staffLoading ? (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator size="small" color={theme.colors.secondary} />
                        </View>
                    ) : staffMembers.map((staff: OwlPayStaff) => {
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

            <StyledCard style={styles.selectionCard}>
                <Ionicons name="wallet-outline" size={42} color={theme.colors.textSecondary} />
                <Text style={styles.selectionText}>
                    {selectedDisplayName ? `Selected: ${selectedDisplayName}` : 'Select a camper/staff to begin'}
                </Text>
                {isFirstScanToday && !selectedIsStaff && (
                    <Text style={styles.firstScanBadge}>First scan today - total will be $0.00</Text>
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
                    {allItems.filter((i) => i.active).map((item) => (
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
                    ))}
                </View>
            </StyledCard>

            <StyledCard>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleWrap}>
                        <Ionicons name="receipt-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>Transaction</Text>
                    </View>
                </View>
                {cart.length === 0 && !isFirstScanToday ? (
                    <Text style={styles.emptyStateText}>No items added yet.</Text>
                ) : (
                    <View style={styles.itemsList}>
                        {cart.map((item) => (
                            <View key={item.id} style={styles.itemRowMain}>
                                <View>
                                    <Text style={styles.itemName}>{item.name}</Text>
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
                    <Text style={styles.totalsLine}>Total: {currency(total)}</Text>
                    {!selectedIsStaff && selectedCamper && (
                        <Text
                            style={[
                                styles.totalsLine,
                                newBalance < 5 ? styles.balanceTextLow : newBalance < 15 ? styles.balanceTextMedium : styles.balanceTextHealthy,
                            ]}
                        >
                            New Balance: {currency(newBalance)}
                        </Text>
                    )}
                    {selectedIsStaff && selectedStaff && <Text style={styles.totalsLine}>Staff Running Tab</Text>}
                    {hasInsufficientFunds && <Text style={styles.insufficientFundsText}>Insufficient funds for this checkout</Text>}
                </View>

                <TouchableOpacity
                    style={[styles.primarySaveButton, (!selectedCamperId || isCompletingTransaction || hasInsufficientFunds) && { opacity: 0.6 }]}
                    onPress={completeTransaction}
                    disabled={!selectedCamperId || isCompletingTransaction || hasInsufficientFunds}
                >
                    <Text style={styles.primaryButtonText}>
                        {isCompletingTransaction
                            ? 'Processing...'
                            : isFirstScanToday && cart.length === 0
                              ? 'Record First Scan'
                              : 'Complete Transaction'}
                    </Text>
                </TouchableOpacity>
            </StyledCard>
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
            <View style={styles.statsGrid}>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Campers</Text>
                    <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{campers.length}</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Balance</Text>
                    <Text style={[styles.statValue, { color: theme.colors.success }]}>{currency(totalBalance)}</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Avg Balance</Text>
                    <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{currency(averageBalance)}</Text>
                </StyledCard>
            </View>

            <StyledCard>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleWrap}>
                        <Ionicons name="cash-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>Camper Balances</Text>
                    </View>
                </View>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.3 }]}>Person ID</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Balance</Text>
                </View>
                <ScrollView style={styles.balancesList} contentContainerStyle={styles.balancesListContent}>
                    {campers.map((camper) => (
                        <View key={camper.id} style={styles.tableRow}>
                            <Text style={[styles.tableText, { flex: 2 }]}>{camper.name}</Text>
                            <Text style={[styles.tableText, { flex: 1.3 }]}>{camper.person_id || '-'}</Text>
                            <View style={styles.tableBalancePill}>
                                <Text style={styles.tableBalancePillText}>{currency(Number(camper.owl_pay_balance || 0))}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
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
                        {reportRange.start.toLocaleDateString()} - {reportRange.end.toLocaleDateString()}
                    </Text>
                    <TouchableOpacity style={styles.customRangeBtn}>
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
                        <Text style={styles.customRangeText}>Custom Range</Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            <View style={styles.statsGrid}>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Revenue</Text>
                    <Text style={styles.statValue}>{currency(reportsData?.totalRevenue || 0)}</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Items Sold</Text>
                    <Text style={styles.statValue}>{reportsData?.totalItems || 0}</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Most Popular</Text>
                    <Text style={styles.statValue}>{reportsData?.mostPopular || 'N/A'}</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Avg Transaction</Text>
                    <Text style={styles.statValue}>{currency(reportsData?.avgTransaction || 0)}</Text>
                </StyledCard>
            </View>

            <StyledCard>
                <View style={styles.reportFilterRow}>
                    {['By Item', 'Over Time', 'Purchases'].map((label) => (
                        <TouchableOpacity key={label} style={styles.rangeButton}>
                            <Text style={styles.rangeButtonText}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.emptyStateBox}>
                    {reportsLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.secondary} />
                    ) : (
                        <Text style={styles.emptyStateText}>No sales data for this period.</Text>
                    )}
                </View>
            </StyledCard>
        </>
    );

    const renderSettings = () => (
        <>
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

            <TouchableOpacity style={styles.fab}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
            </TouchableOpacity>

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
                visible={!!successData}
                transparent
                animationType="fade"
                onRequestClose={() => setSuccessData(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSuccessData(null)}>
                    <Pressable style={styles.successCard} onPress={(e) => e.stopPropagation()}>
                        <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                        <Text style={styles.successTitle}>{successData?.camperName}</Text>
                        {successData?.isFirstScan ? (
                            <Text style={styles.successSubtext}>First scan recorded for free entry</Text>
                        ) : (
                            <Text style={styles.successSubtext}>
                                Charged: {currency(successData?.chargedAmount || 0)}
                            </Text>
                        )}
                        {!successData?.isStaff && (
                            <Text style={styles.successBalance}>
                                New Balance: {currency(successData?.newBalance || 0)}
                            </Text>
                        )}
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
    scanStatusSuccess: { color: '#16a34a' },
    scanStatusError: { color: '#dc2626' },
    selectionCard: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        gap: 10,
    },
    selectionText: { color: theme.colors.textSecondary, fontSize: 20, textAlign: 'center' },
    firstScanBadge: {
        marginTop: 8,
        color: theme.colors.success,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
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
