import React, { useState } from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Pressable, ScrollView, Platform } from 'react-native';
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
import { DailyScheduleScreen } from '../screens/DailyScheduleScreen';
import { TigerTimesScreen } from '../screens/TigerTimesScreen';
import { ElectiveSignUpScreen } from '../screens/ElectiveSignUpScreen';

import { ODManagementScreen } from '../screens/ODManagementScreen';
import { useRole } from '../hooks/useRole';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const hexToHsl = (hex: string) => {
    const cleaned = hex.replace('#', '');
    if (cleaned.length !== 6) return null;

    const r = parseInt(cleaned.substring(0, 2), 16) / 255;
    const g = parseInt(cleaned.substring(2, 4), 16) / 255;
    const b = parseInt(cleaned.substring(4, 6), 16) / 255;
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            default:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
};

const darkenHexForSidebar = (hex: string, amount = 40) => {
    const hsl = hexToHsl(hex);
    if (!hsl) return theme.colors.primary;
    const nextL = Math.max(0, hsl.l - amount);
    return `hsl(${hsl.h}, ${hsl.s}%, ${nextL}%)`;
};

// Custom Drawer Content with Role-Based Visibility
const CustomDrawerContent = (props: any) => {
    const [searchText, setSearchText] = useState('');
    const { data: roleData } = useRole();
    const { availableCompanies, switchCompany, companyId, companySlug, companyThemeColor, isSuperAdmin: isSuperAdminCompany, loadError, retryLoad, season, setSeason, availableSeasons, isTimberLakeCamp } = useCompany();
    const [showCampPicker, setShowCampPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

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

    const drawerBgColor = companyThemeColor
        ? darkenHexForSidebar(companyThemeColor, 40)
        : theme.colors.primary;

    return (
        <View style={{ flex: 1, backgroundColor: drawerBgColor }}>
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

                {/* Year / Season Selector */}
                <View style={styles.campSwitcherWrap}>
                    <TouchableOpacity
                        style={styles.campSwitcher}
                        onPress={() => { setShowYearPicker((prev) => !prev); setShowCampPicker(false); }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                        <Text style={styles.campSwitcherText}>{season}</Text>
                        <Ionicons name={showYearPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {showYearPicker && (
                        <View style={styles.campDropdown}>
                            {availableSeasons.map((yr) => {
                                const isActive = yr === season;
                                return (
                                    <TouchableOpacity
                                        key={yr}
                                        style={[
                                            styles.campDropdownItem,
                                            isActive && styles.campDropdownItemActive,
                                        ]}
                                        onPress={() => {
                                            setSeason(yr);
                                            setShowYearPicker(false);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        {isActive && (
                                            <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 6 }} />
                                        )}
                                        <Text
                                            style={[
                                                styles.campDropdownItemText,
                                                isActive && styles.campDropdownItemTextActive,
                                            ]}
                                        >
                                            {yr}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Camp Switcher (Super Admin only) */}
                {(isSuperAdmin || isSuperAdminCompany) && availableCompanies.length > 1 && (
                    <View style={styles.campSwitcherWrap}>
                        <TouchableOpacity
                            style={styles.campSwitcher}
                            onPress={() => { setShowCampPicker((prev) => !prev); setShowYearPicker(false); }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="business-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <Text style={styles.campSwitcherText} numberOfLines={1}>{currentCompanyName}</Text>
                            <Ionicons name={showCampPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {showCampPicker && (
                            <View style={styles.campDropdown}>
                                {availableCompanies.map((company) => {
                                    const isActive = company.id === companyId;
                                    return (
                                        <TouchableOpacity
                                            key={company.id}
                                            style={[
                                                styles.campDropdownItem,
                                                isActive && styles.campDropdownItemActive,
                                            ]}
                                            onPress={() => {
                                                switchCompany(company.id);
                                                setShowCampPicker(false);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            {isActive && (
                                                <Ionicons name="checkmark" size={16} color={theme.colors.text} style={{ marginRight: 6 }} />
                                            )}
                                            <Text
                                                style={[
                                                    styles.campDropdownItemText,
                                                    isActive && styles.campDropdownItemTextActive,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {company.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
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
                {companySlug === 'tyler-hill-camp' && (
                    <>
                        <DrawerItem
                            label="Special Meals"
                            icon={({ color }) => <Ionicons name="restaurant-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('SpecialMeals')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Owl Pay"
                            icon={({ color }) => <Ionicons name="wallet-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('OwlPay')}
                            {...drawerItemProps}
                        />
                    </>
                )}
                        {isTimberLakeCamp && (
                            <>
                                <DrawerItem
                                    label="Daily Schedule"
                                    icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                                    onPress={() => props.navigation.navigate('DailySchedule')}
                                    {...drawerItemProps}
                                />
                                <DrawerItem
                                    label="Tiger Times"
                                    icon={({ color }) => <Ionicons name="newspaper-outline" size={22} color={color} />}
                                    onPress={() => props.navigation.navigate('TigerTimes')}
                                    {...drawerItemProps}
                                />
                                <DrawerItem
                                    label="Elective Sign-Up"
                                    icon={({ color }) => <Ionicons name="link-outline" size={22} color={color} />}
                                    onPress={() => props.navigation.navigate('ElectiveSignUp')}
                                    {...drawerItemProps}
                                />
                            </>
                        )}
                        <DrawerItem
                            label="Special Events & Evening Activities"
                            icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('SpecialEvents')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label="Sports Academy"
                            icon={({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />}
                            onPress={() => props.navigation.navigate('Sports')}
                            {...drawerItemProps}
                        />
                        <DrawerItem
                            label={companySlug === 'timber-lake-west' ? 'Athletics' : 'Sports Calendar'}
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
                        {companySlug !== 'timber-lake-camp' && (
                            <DrawerItem
                                label={companySlug === 'tyler-hill-camp' ? 'Daily News' : 'Daily Notes'}
                                icon={({ color }) => <Ionicons name="document-text-outline" size={22} color={color} />}
                                onPress={() => props.navigation.navigate('DailyNews')}
                                {...drawerItemProps}
                                activeTintColor={theme.colors.surface}
                                activeBackgroundColor={theme.colors.sidebarActiveBg}
                            />
                        )}
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
            <Drawer.Screen name="DailySchedule" component={DailyScheduleScreen} />
            <Drawer.Screen name="TigerTimes" component={TigerTimesScreen} />
            <Drawer.Screen name="ElectiveSignUp" component={ElectiveSignUpScreen} />
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
    campSwitcherWrap: {
        marginBottom: theme.spacing.md,
        zIndex: 10,
    },
    campSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.sm,
        height: 44,
    },
    campSwitcherText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
    },
    campDropdown: {
        marginTop: 4,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingVertical: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    campDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        marginHorizontal: 4,
    },
    campDropdownItemActive: {
        backgroundColor: '#f97316',
        borderRadius: theme.borderRadius.md,
    },
    campDropdownItemText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    campDropdownItemTextActive: {
        fontWeight: '700',
        color: '#fff',
    },
});
