import React, { useMemo, useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { StyledCard } from '../components/StyledCard';
import { theme } from '../theme/theme';

type OwlPayTab = 'pos' | 'items' | 'balances' | 'reports' | 'settings';
type ItemCategory = 'Food' | 'Snacks' | 'Drinks' | 'Other';

type Camper = {
    id: string;
    name: string;
    personId: string;
    balance: number;
};

type CanteenItem = {
    id: string;
    name: string;
    price: number;
    category: ItemCategory;
};

const INITIAL_CAMPERS: Camper[] = [
    { id: '1', name: 'Adam Elliott', personId: '8947944', balance: 0 },
    { id: '2', name: 'Adrianna Gelb', personId: '11001910', balance: 0 },
    { id: '3', name: 'Aiden Feld', personId: '18230467', balance: 0 },
    { id: '4', name: 'Alex Haboush', personId: '8128371', balance: 0 },
    { id: '5', name: 'Alex Stumacher', personId: '15611027', balance: 0 },
    { id: '6', name: 'Alexa Alfred', personId: '11974301', balance: 0 },
];

const currency = (amount: number) => `$${amount.toFixed(2)}`;

export const OwlPayScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<OwlPayTab>('pos');
    const [camperQuery, setCamperQuery] = useState('');
    const [selectedCamperId, setSelectedCamperId] = useState<string | null>(null);
    const [items, setItems] = useState<CanteenItem[]>([]);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [itemForm, setItemForm] = useState({ name: '', price: '', category: 'Snacks' as ItemCategory });
    const [reportsRange, setReportsRange] = useState<'Today' | 'This Week' | 'This Month' | 'All Time'>('All Time');
    const [lowBalanceAlertsEnabled, setLowBalanceAlertsEnabled] = useState(false);
    const [staffReportsEnabled, setStaffReportsEnabled] = useState(false);

    const tabs: { key: OwlPayTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: 'pos', label: 'POS', icon: 'cart-outline' },
        { key: 'items', label: 'Items', icon: 'cube-outline' },
        { key: 'balances', label: 'Balances', icon: 'cash-outline' },
        { key: 'reports', label: 'Reports', icon: 'bar-chart-outline' },
        { key: 'settings', label: 'Settings', icon: 'settings-outline' },
    ];

    const filteredCampers = useMemo(() => {
        const q = camperQuery.trim().toLowerCase();
        if (!q) return INITIAL_CAMPERS;
        return INITIAL_CAMPERS.filter((c) => {
            const haystack = `${c.name} ${c.personId}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [camperQuery]);

    const selectedCamper = INITIAL_CAMPERS.find((c) => c.id === selectedCamperId) || null;
    const totalBalance = INITIAL_CAMPERS.reduce((sum, camper) => sum + camper.balance, 0);
    const averageBalance = INITIAL_CAMPERS.length ? totalBalance / INITIAL_CAMPERS.length : 0;

    const addItem = () => {
        const name = itemForm.name.trim();
        const price = Number(itemForm.price);
        if (!name || Number.isNaN(price) || price < 0) return;

        setItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}`,
                name,
                price,
                category: itemForm.category,
            },
        ]);
        setItemForm({ name: '', price: '', category: 'Snacks' });
        setShowCategoryDropdown(false);
        setShowAddItemModal(false);
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
                        onChangeText={setCamperQuery}
                        placeholder="Scan RFID or search..."
                        placeholderTextColor={theme.colors.textSecondary}
                        style={styles.searchInput}
                    />
                    <Ionicons name="scan-outline" size={18} color={theme.colors.secondary} />
                </View>

                <ScrollView style={styles.camperList} contentContainerStyle={styles.camperListContent}>
                    {filteredCampers.map((camper) => {
                        const isSelected = camper.id === selectedCamperId;
                        return (
                            <TouchableOpacity
                                key={camper.id}
                                style={[styles.camperCard, isSelected && styles.camperCardSelected]}
                                onPress={() => setSelectedCamperId(camper.id)}
                            >
                                <View style={styles.avatarCircle}>
                                    <Ionicons name="person-outline" size={18} color={theme.colors.secondary} />
                                </View>
                                <View style={styles.camperCardText}>
                                    <Text style={styles.camperName}>{camper.name}</Text>
                                </View>
                                <View style={styles.balancePill}>
                                    <Text style={styles.balancePillText}>{currency(camper.balance)}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </StyledCard>

            <StyledCard style={styles.selectionCard}>
                <Ionicons name="search-outline" size={42} color={theme.colors.textSecondary} />
                <Text style={styles.selectionText}>
                    {selectedCamper ? `Selected: ${selectedCamper.name}` : 'Select a camper to begin'}
                </Text>
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

            {items.length === 0 ? (
                <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateText}>No items yet. Add your first canteen item!</Text>
                </View>
            ) : (
                <View style={styles.itemsList}>
                    {items.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemMeta}>{item.category}</Text>
                            </View>
                            <Text style={styles.itemPrice}>{currency(item.price)}</Text>
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
                    <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{INITIAL_CAMPERS.length}</Text>
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
                    {INITIAL_CAMPERS.map((camper) => (
                        <View key={camper.id} style={styles.tableRow}>
                            <Text style={[styles.tableText, { flex: 2 }]}>{camper.name}</Text>
                            <Text style={[styles.tableText, { flex: 1.3 }]}>{camper.personId}</Text>
                            <View style={styles.tableBalancePill}>
                                <Text style={styles.tableBalancePillText}>{currency(camper.balance)}</Text>
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
                    <Text style={styles.dateChip}>Jan 01, 2020 - Mar 26, 2026</Text>
                    <TouchableOpacity style={styles.customRangeBtn}>
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
                        <Text style={styles.customRangeText}>Custom Range</Text>
                    </TouchableOpacity>
                </View>
            </StyledCard>

            <View style={styles.statsGrid}>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Revenue</Text>
                    <Text style={styles.statValue}>{currency(0)}</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Items Sold</Text>
                    <Text style={styles.statValue}>0</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Most Popular</Text>
                    <Text style={styles.statValue}>N/A</Text>
                </StyledCard>
                <StyledCard style={styles.statCard}>
                    <Text style={styles.statLabel}>Avg Transaction</Text>
                    <Text style={styles.statValue}>{currency(0)}</Text>
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
                    <Text style={styles.emptyStateText}>No sales data for this period.</Text>
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
            </StyledCard>

            <View style={styles.saveRow}>
                <TouchableOpacity style={styles.primarySaveButton}>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>Save Settings</Text>
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
    camperCardText: { flex: 1 },
    camperName: { fontSize: 16, color: theme.colors.text, fontWeight: '600' },
    balancePill: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    balancePillText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
    selectionCard: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        gap: 10,
    },
    selectionText: { color: theme.colors.textSecondary, fontSize: 20, textAlign: 'center' },
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
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
});
