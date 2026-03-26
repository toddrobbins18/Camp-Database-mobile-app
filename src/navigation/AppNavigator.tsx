import React, { useState } from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCompany } from '../contexts/CompanyContext';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CamperScreen } from '../screens/CamperScreen';
import { CamperDetailScreen } from '../screens/CamperDetailScreen';
import { StaffScreen } from '../screens/StaffScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { TransportScreen } from '../screens/TransportScreen';
import { SportsScreen } from '../screens/SportsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { RosterTemplatesScreen } from '../screens/RosterTemplatesScreen';
import { SpecialEventsScreen } from '../screens/SpecialEventsScreen';
import { SpecialMealsScreen } from '../screens/SpecialMealsScreen';
import { SportsCalendarScreen } from '../screens/SportsCalendarScreen';
import { RainyDayScheduleScreen } from '../screens/RainyDayScheduleScreen';
import { TutoringTherapyScreen } from '../screens/TutoringTherapyScreen';
import { IncidentReportsScreen } from '../screens/IncidentReportsScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { AddMenuItemScreen } from '../screens/AddMenuItemScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { AdminPanelScreen } from '../screens/AdminPanelScreen';
import { EvaluationQuestionsScreen } from '../screens/EvaluationQuestionsScreen';
import { QuestionTextScreen } from '../screens/QuestionTextScreen';
import { RolePermissionsScreen } from '../screens/RolePermissionsScreen';
import { DivisionPermissionsScreen } from '../screens/DivisionPermissionsScreen';
import { ActivitiesFieldTripsScreen } from '../screens/ActivitiesFieldTripsScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { AwardsScreen } from '../screens/AwardsScreen';
import { DailyNewsScreen } from '../screens/DailyNewsScreen';
import { UserApprovalsScreen } from '../screens/UserApprovalsScreen';
import { AccessDeniedScreen } from '../screens/AccessDeniedScreen';
import { SpecialistSportAssignmentsScreen } from '../screens/SpecialistSportAssignmentsScreen';
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';
import { OwlPayScreen } from '../screens/OwlPayScreen';

import { ODManagementScreen } from '../screens/ODManagementScreen';
import { useRole } from '../hooks/useRole';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Custom Drawer Content with Role-Based Visibility
const CustomDrawerContent = (props: any) => {
    const [searchText, setSearchText] = useState('');
    const [selectedYear, setSelectedYear] = useState('2026');
    const { data: roleData } = useRole();
    const { availableCompanies, switchCompany, companyId, isSuperAdmin: isSuperAdminCompany, loadError, retryLoad } = useCompany();
    const [showCampPicker, setShowCampPicker] = useState(false);

    // Role flags (default to showing Main Menu items while loading)
    const isSuperAdmin = roleData?.isSuperAdmin ?? false;
    const isAdmin = roleData?.isAdmin ?? false;  // includes super_admin
    const isStaff = roleData?.isStaff ?? false;
    const isRoleLoaded = !!roleData;

    // Access helpers
    const canSeeStaffScreens = isAdmin || isStaff || !isRoleLoaded; // staff+ or loading
    const canSeeAdminScreens = isAdmin || !isRoleLoaded;             // admin+ or loading
    const canSeeSuperAdminOnly = isSuperAdmin;                       // super_admin only

    const drawerItemProps = {
        labelStyle: styles.drawerLabel,
        inactiveTintColor: '#94a3b8',
    };

    const currentCompanyName = availableCompanies.find(c => c.id === companyId)?.name || 'Select Camp';

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
            {loadError ? (
                <View style={styles.loadErrorBanner}>
                    <Text style={styles.loadErrorText} numberOfLines={2}>{loadError}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
            <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
                {/* Header / Logo */}
                <View style={styles.header}>
                    <Text style={styles.logoText}>The Nest</Text>
                </View>

                {/* Search Input Field */}
                <View style={styles.inputFieldContainer}>
                    <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.inputField}
                        placeholder=""
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* Year Selector */}
                <View style={styles.inputFieldContainer}>
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.inputField}
                        value={selectedYear}
                        onChangeText={setSelectedYear}
                        editable={false}
                    />
                    <TouchableOpacity style={styles.dropdownIcon}>
                        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Camp Switcher (Super Admin only) */}
                {(isSuperAdmin || isSuperAdminCompany) && availableCompanies.length > 1 && (
                    <>
                        <TouchableOpacity
                            style={styles.campSwitcher}
                            onPress={() => setShowCampPicker(true)}
                        >
                            <Ionicons name="business-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <Text style={styles.campSwitcherText} numberOfLines={1}>{currentCompanyName}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Modal
                            visible={showCampPicker}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setShowCampPicker(false)}
                        >
                            <Pressable style={styles.campPickerOverlay} onPress={() => setShowCampPicker(false)}>
                                <Pressable style={styles.campPickerContainer} onPress={e => e.stopPropagation()}>
                                    <Text style={styles.campPickerTitle}>Switch Camp</Text>
                                    <ScrollView style={{ maxHeight: 300 }}>
                                        {availableCompanies.map(company => (
                                            <TouchableOpacity
                                                key={company.id}
                                                style={[
                                                    styles.campPickerItem,
                                                    company.id === companyId && styles.campPickerItemActive,
                                                ]}
                                                onPress={() => {
                                                    switchCompany(company.id);
                                                    setShowCampPicker(false);
                                                }}
                                            >
                                                <Ionicons
                                                    name={company.id === companyId ? 'radio-button-on' : 'radio-button-off'}
                                                    size={20}
                                                    color={company.id === companyId ? '#6366f1' : theme.colors.textSecondary}
                                                />
                                                <Text style={[
                                                    styles.campPickerItemText,
                                                    company.id === companyId && styles.campPickerItemTextActive,
                                                ]}>
                                                    {company.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </Pressable>
                            </Pressable>
                        </Modal>
                    </>
                )}

                <Text style={styles.sectionHeader}>Main Menu</Text>

                {/* ── Everyone (all roles) ── */}
                <DrawerItem
                    label="Dashboard"
                    icon={({ color }) => <Ionicons name="home-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Dashboard')}
                    {...drawerItemProps}
                />
                <DrawerItem
                    label="Camper"
                    icon={({ color }) => <Ionicons name="people-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Camper', { screen: 'CamperList' })}
                    {...drawerItemProps}
                />
                <DrawerItem
                    label="Master Calendar"
                    icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Calendar')}
                    {...drawerItemProps}
                />
                <DrawerItem
                    label="Menu"
                    icon={({ color }) => <Ionicons name="restaurant-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Menu')}
                    {...drawerItemProps}
                />
                        <DrawerItem
                            label="Messages"
                            icon={({ color }) => <Ionicons name="mail-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Messages')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Notification Preferences"
                            icon={({ color }) => <Ionicons name="notifications-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('NotificationPreferences')}
                            {...drawerItemProps}
                        />

                {/* ── Staff + Admin + Super Admin ── */}
                {canSeeStaffScreens && (
                    <>
                        <DrawerItem
                            label="Activities & Field Trips"
                            icon={({ color }) => <Ionicons name="leaf-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('ActivitiesFieldTrips')}
                            {...drawerItemProps}
                            activeTintColor={theme.colors.surface}
                            activeBackgroundColor={theme.colors.sidebarActiveBg}
                        />
                        <DrawerItem
                            label="Appointments"
                            icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Appointments')}
                            {...drawerItemProps}
                            activeTintColor={theme.colors.surface}
                            activeBackgroundColor={theme.colors.sidebarActiveBg}
                        />
                        <DrawerItem
                            label="Nurse"
                            icon={({ color }) => <Ionicons name="medical-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Health')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="OD Management"
                            icon={({ color }) => <Ionicons name="clipboard-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('ODManagement')}
                            {...drawerItemProps}
                        />
                <DrawerItem
                    label="Owl Pay"
                    icon={({ color }) => <Ionicons name="wallet-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('OwlPay')}
                    {...drawerItemProps}
                />
                        <DrawerItem
                            label="Special Events & Evening Activities"
                            icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('SpecialEvents')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Special Meals"
                            icon={({ color }) => <Ionicons name="restaurant-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('SpecialMeals')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Sports Academy"
                            icon={({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Sports')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Sports Calendar"
                            icon={({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('SportsCalendar')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Staff"
                            icon={({ color }) => <Ionicons name="person-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Staff')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Transportation"
                            icon={({ color }) => <Ionicons name="car-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Transport')}
                            {...drawerItemProps}
                        />
                    </>
                )}

                {/* ── Admin + Super Admin only ── */}
                {canSeeAdminScreens && (
                    <>
                        <DrawerItem
                            label="Awards"
                            icon={({ color }) => <Ionicons name="ribbon-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Awards')}
                            {...drawerItemProps}
                            activeTintColor={theme.colors.surface}
                            activeBackgroundColor={theme.colors.sidebarActiveBg}
                        />
                        <DrawerItem
                            label="Daily News"
                            icon={({ color }) => <Ionicons name="document-text-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('DailyNews')}
                            {...drawerItemProps}
                            activeTintColor={theme.colors.surface}
                            activeBackgroundColor={theme.colors.sidebarActiveBg}
                        />
                        <DrawerItem
                            label="Incident Reports"
                            icon={({ color }) => <Ionicons name="warning-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('IncidentReports')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Rainy Day Schedule"
                            icon={({ color }) => <Ionicons name="rainy-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('RainyDaySchedule')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Reports"
                            icon={({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Reports')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Roster Templates"
                            icon={({ color }) => <Ionicons name="list-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('RosterTemplates')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Tutoring & Therapy"
                            icon={({ color }) => <Ionicons name="book-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('TutoringTherapy')}
                            {...drawerItemProps}
                        />
                    </>
                )}

                {/* ── Administration Section (Admin+) ── */}
                {canSeeAdminScreens && (
                    <>
                        <Text style={styles.sectionHeader}>Administration</Text>
                        <DrawerItem
                            label="Admin Panel"
                            icon={({ color }) => <Ionicons name="shield-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('AdminPanel')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Evaluation Questions"
                            icon={({ color }) => <Ionicons name="clipboard-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('EvaluationQuestions')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Specialist Sport Assignments"
                            icon={({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('SpecialistSportAssignments')}
                            {...drawerItemProps}
                        />
                    </>
                )}

                {/* ── Admin+ (Admin + Super Admin) ── */}
                {canSeeAdminScreens && (
                    <>
                        <DrawerItem
                            label="Role Permissions"
                            icon={({ color }) => <Ionicons name="settings-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('RolePermissions')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Division Permissions"
                            icon={({ color }) => <Ionicons name="settings-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('DivisionPermissions')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="User Approvals"
                            icon={({ color }) => <Ionicons name="checkmark-circle-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('UserApprovals')}
                            {...drawerItemProps}
                        />
                    </>
                )}

            </DrawerContentScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <DrawerItem
                    label="Log out"
                    icon={({ color }) => <Ionicons name="exit-outline" size={22} color={color} />}
                    onPress={async () => {
                        await supabase.auth.signOut();
                        props.navigation.getParent()?.navigate('Login');
                    }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
            </View>
        </View>
    );
};

// Camper Stack Navigator
const CamperStackNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="CamperList" component={CamperScreen} />
            <Stack.Screen name="CamperDetail" component={CamperDetailScreen} />
        </Stack.Navigator>
    );
};

// Menu Stack Navigator
const MenuStackNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="MenuList" component={MenuScreen} />
            <Stack.Screen name="AddMenuItem" component={AddMenuItemScreen} />
        </Stack.Navigator>
    );
};

// Main App Navigator (Drawer)
const MainAppNavigator = () => {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false, // We use custom headers in screens
                drawerType: 'front',
                drawerStyle: { width: '80%' },
            }}
            initialRouteName="Dashboard"
        >
            <Drawer.Screen name="Dashboard" component={DashboardScreen} />
            <Drawer.Screen name="Camper" component={CamperStackNavigator} />
            <Drawer.Screen name="Staff" component={StaffScreen} />
            <Drawer.Screen name="Calendar" component={CalendarScreen} />
            <Drawer.Screen name="Health" component={HealthScreen} />
            <Drawer.Screen name="Transport" component={TransportScreen} />
            <Drawer.Screen name="Sports" component={SportsScreen} />
            <Drawer.Screen name="SportsCalendar" component={SportsCalendarScreen} />
            <Drawer.Screen name="RainyDaySchedule" component={RainyDayScheduleScreen} />
            <Drawer.Screen name="TutoringTherapy" component={TutoringTherapyScreen} />
            <Drawer.Screen name="Reports" component={ReportsScreen} />
            <Drawer.Screen name="RosterTemplates" component={RosterTemplatesScreen} />
            <Drawer.Screen name="SpecialEvents" component={SpecialEventsScreen} />
            <Drawer.Screen name="SpecialMeals" component={SpecialMealsScreen} />
            <Drawer.Screen name="IncidentReports" component={IncidentReportsScreen} />
            <Drawer.Screen name="Menu" component={MenuStackNavigator} />
            <Drawer.Screen name="Messages" component={MessagesScreen} />
            <Drawer.Screen name="AdminPanel" component={AdminPanelScreen} />
            <Drawer.Screen name="EvaluationQuestions" component={EvaluationQuestionsScreen} />
            <Drawer.Screen name="QuestionText" component={QuestionTextScreen} />
            <Drawer.Screen name="RolePermissions" component={RolePermissionsScreen} />
            <Drawer.Screen name="DivisionPermissions" component={DivisionPermissionsScreen} />
            <Drawer.Screen name="ActivitiesFieldTrips" component={ActivitiesFieldTripsScreen} />
            <Drawer.Screen name="Appointments" component={AppointmentsScreen} />
            <Drawer.Screen name="Awards" component={AwardsScreen} />
            <Drawer.Screen name="DailyNews" component={DailyNewsScreen} />
            <Drawer.Screen name="UserApprovals" component={UserApprovalsScreen} />
            <Drawer.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            <Drawer.Screen name="AccessDenied" component={AccessDeniedScreen} />
            <Drawer.Screen name="SpecialistSportAssignments" component={SpecialistSportAssignmentsScreen} />
            <Drawer.Screen name="ODManagement" component={ODManagementScreen} />
            <Drawer.Screen name="OwlPay" component={OwlPayScreen} />
        </Drawer.Navigator>
    );
};

// Root Navigator (Stack)
export const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
                initialRouteName="Login"
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="MainApp" component={MainAppNavigator} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadErrorBanner: {
        backgroundColor: theme.colors.danger || '#dc2626',
        padding: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    loadErrorText: {
        color: '#fff',
        fontSize: 13,
        flex: 1,
    },
    retryButton: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    drawerContent: {
        paddingTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
    },
    header: {
        marginBottom: theme.spacing.lg,
        paddingLeft: theme.spacing.sm,
    },
    logoText: {
        color: theme.colors.surface,
        fontSize: 24,
        fontWeight: 'bold',
    },
    inputFieldContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    inputIcon: {
        marginRight: theme.spacing.xs,
    },
    inputField: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    dropdownIcon: {
        paddingLeft: theme.spacing.xs,
    },
    sectionHeader: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xs,
        paddingLeft: theme.spacing.sm,
        textTransform: 'uppercase',
    },
    drawerLabel: {
        fontSize: 14,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingBottom: theme.spacing.lg,
    },
    campSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    campSwitcherText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
    },
    campPickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    campPickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        width: '85%',
        maxWidth: 360,
    },
    campPickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    campPickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: 12,
        marginBottom: 4,
    },
    campPickerItemActive: {
        backgroundColor: '#eef2ff',
    },
    campPickerItemText: {
        fontSize: 15,
        color: theme.colors.text,
    },
    campPickerItemTextActive: {
        fontWeight: '700',
        color: '#6366f1',
    },
});
