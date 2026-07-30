import React, { useEffect, useState } from 'react';
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
import { StaffDetailScreen } from '../screens/StaffDetailScreen';
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
import { DailyWolfManagementScreen } from '../screens/DailyWolfManagementScreen';
import { DailyWolfPrintableScreen } from '../screens/DailyWolfPrintableScreen';
import { UserApprovalsScreen } from '../screens/UserApprovalsScreen';
import { AccessDeniedScreen } from '../screens/AccessDeniedScreen';
import { SpecialistSportAssignmentsScreen } from '../screens/SpecialistSportAssignmentsScreen';
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';
import { OwlPayGateScreen } from '../screens/OwlPayGateScreen';
import { DailyScheduleScreen } from '../screens/DailyScheduleScreen';
import { TigerTimesScreen } from '../screens/TigerTimesScreen';
import { ElectiveSignUpScreen } from '../screens/ElectiveSignUpScreen';
import { DayCampPlaceholderScreen } from '../screens/DayCampPlaceholderScreen';
import {
    getDayCampNestCarryoverMenuItems,
    getDayCampPocMenuItems,
    MobileDrawerMenuItem,
} from '../constants/dayCampMenu';

import { ODManagementScreen } from '../screens/ODManagementScreen';
import { useRole } from '../hooks/useRole';
import { useMenuAccess } from '../hooks/useMenuAccess';
import { withMenuPermission } from '../components/MenuPermissionGate';
import { useMessagesRealtimeSync, useInboxUnreadCount } from '../api/messages';
import {
    registerInboxNotificationPresentation,
    ensureInboxNotificationChannel,
    requestInboxNotificationPermission,
} from '../lib/inboxLocalNotification';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';
import { getMenuDrawerThemeFromCompany } from '../theme/menuDrawerTheme';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function toDrawerMenuItem(
    item: MobileDrawerMenuItem,
    navigation: any,
): {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
} {
    return {
        key: item.key,
        label: item.label,
        icon: item.icon,
        onPress: () => {
            if (item.params) {
                navigation.navigate(item.screen, item.params);
            } else {
                navigation.navigate(item.screen);
            }
        },
    };
}

function filterDayCampMenu(
    items: MobileDrawerMenuItem[],
    hasMenuAccess: (menuItem: string) => boolean,
): MobileDrawerMenuItem[] {
    return items.filter((item) => hasMenuAccess(item.menuId));
}

// Custom Drawer Content with Role-Based Visibility
const CustomDrawerContent = (props: any) => {
    const [searchText, setSearchText] = useState('');
    const { data: roleData } = useRole();
    const { availableCompanies, switchCompany, companyId, companySlug, companyThemeColor, isSuperAdmin: isSuperAdminCompany, loadError, retryLoad, season, setSeason, availableSeasons, isTimberLakeCamp, isTimberLakeWest, isDayCamp } = useCompany();
    const { hasMenuAccess } = useMenuAccess();
    const [showCampPicker, setShowCampPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

    // Role flags — globalRoles match web AuthContext (admin at one camp applies when switching camps).
    const isSuperAdmin = isSuperAdminCompany || (roleData?.isSuperAdmin ?? false);
    const isAdmin = roleData?.isAdmin ?? false;

    const [drawerAuthUserId, setDrawerAuthUserId] = useState<string | null>(null);
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setDrawerAuthUserId(data.user?.id ?? null));
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setDrawerAuthUserId(session?.user?.id ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const { data: inboxUnreadCount = 0 } = useInboxUnreadCount(drawerAuthUserId);

    // Administration section is admin/super_admin only (matches web).
    const canSeeAdminScreens = isAdmin;

    const menuTheme = getMenuDrawerThemeFromCompany({
        companySlug,
        companyThemeColor,
    });

    const drawerItemProps = {
        labelStyle: styles.drawerLabel,
        inactiveTintColor: menuTheme.menuItemInactive,
        activeTintColor: menuTheme.menuActiveTint,
        activeBackgroundColor: menuTheme.menuActiveBackground,
    };

    const currentCompanyName = availableCompanies.find(c => c.id === companyId)?.name || 'Select Camp';

    const campSwitcherStyle = [
        styles.campSwitcher,
        menuTheme.campSwitcherBorderWidth > 0 && {
            borderWidth: menuTheme.campSwitcherBorderWidth,
            borderColor: menuTheme.campSwitcherBorderColor,
        },
    ];

    const mainMenuItems: Array<{
        key: string;
        label: string;
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
    }> = [];

    const dayCampMenuItems: Array<{
        key: string;
        label: string;
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
    }> = [];

    if (isDayCamp) {
        const carryover = filterDayCampMenu(getDayCampNestCarryoverMenuItems(), hasMenuAccess);
        const poc = filterDayCampMenu(getDayCampPocMenuItems(), hasMenuAccess);
        mainMenuItems.push(...carryover.map((item) => toDrawerMenuItem(item, props.navigation)));
        dayCampMenuItems.push(...poc.map((item) => toDrawerMenuItem(item, props.navigation)));
    } else {
    mainMenuItems.push(
        { key: 'dashboard', label: 'Dashboard', icon: 'home-outline', onPress: () => props.navigation.navigate('Dashboard') },
    );

    if (hasMenuAccess('roster')) {
        mainMenuItems.push(
            { key: 'camper', label: 'Camper', icon: 'people-outline', onPress: () => props.navigation.navigate('Camper', { screen: 'CamperList' }) },
        );
    }

    mainMenuItems.push(
        { key: 'master-calendar', label: 'Master Calendar', icon: 'calendar-outline', onPress: () => props.navigation.navigate('Calendar') },
        { key: 'menu', label: 'Menu', icon: 'restaurant-outline', onPress: () => props.navigation.navigate('Menu') },
        { key: 'messages', label: 'Messages', icon: 'mail-outline', onPress: () => props.navigation.navigate('Messages') },
        { key: 'notification-preferences', label: 'Notification Preferences', icon: 'notifications-outline', onPress: () => props.navigation.navigate('NotificationPreferences') },
    );

    if (hasMenuAccess('activities')) {
        mainMenuItems.push(
            { key: 'activities-field-trips', label: 'Activities & Field Trips', icon: 'leaf-outline', onPress: () => props.navigation.navigate('ActivitiesFieldTrips') }
        );
    }
    if (hasMenuAccess('appointments')) {
        mainMenuItems.push(
            { key: 'appointments', label: 'Appointments', icon: 'calendar-outline', onPress: () => props.navigation.navigate('Appointments') }
        );
    }
    if (hasMenuAccess('nurse')) {
        mainMenuItems.push(
            { key: 'nurse', label: 'Nurse', icon: 'medical-outline', onPress: () => props.navigation.navigate('Health') }
        );
    }
    if (hasMenuAccess('od-management')) {
        mainMenuItems.push(
            { key: 'od-management', label: 'OD Management', icon: 'clipboard-outline', onPress: () => props.navigation.navigate('ODManagement') }
        );
    }
    if (hasMenuAccess('special-events')) {
        mainMenuItems.push(
            { key: 'special-events', label: 'Special Events & Evening Activities', icon: 'calendar-outline', onPress: () => props.navigation.navigate('SpecialEvents') }
        );
    }
    if (hasMenuAccess('sports-academy')) {
        mainMenuItems.push(
            { key: 'sports-academy', label: 'Sports Academy', icon: 'trophy-outline', onPress: () => props.navigation.navigate('Sports') }
        );
    }
    if (hasMenuAccess('sports-calendar')) {
        mainMenuItems.push(
            { key: 'sports-calendar', label: companySlug === 'timber-lake-west' ? 'Athletics' : 'Sports Calendar', icon: 'trophy-outline', onPress: () => props.navigation.navigate('SportsCalendar') }
        );
    }
    if (hasMenuAccess('staff')) {
        mainMenuItems.push(
            { key: 'staff', label: 'Staff', icon: 'person-outline', onPress: () => props.navigation.navigate('Staff') }
        );
    }
    if (hasMenuAccess('transportation')) {
        mainMenuItems.push(
            { key: 'transportation', label: 'Transportation', icon: 'car-outline', onPress: () => props.navigation.navigate('Transport') }
        );
    }

    if (companySlug === 'tyler-hill-camp' && hasMenuAccess('owl-pay')) {
        mainMenuItems.push(
            { key: 'owl-pay', label: 'Owl Pay', icon: 'wallet-outline', onPress: () => props.navigation.navigate('OwlPay') }
        );
    }
    if (hasMenuAccess('special-meals')) {
        mainMenuItems.push(
            { key: 'special-meals', label: 'Special Meals', icon: 'restaurant-outline', onPress: () => props.navigation.navigate('SpecialMeals') }
        );
    }
    if (isTimberLakeCamp) {
        if (hasMenuAccess('daily-schedule')) {
            mainMenuItems.push(
                { key: 'daily-schedule', label: 'Daily Schedule', icon: 'calendar-outline', onPress: () => props.navigation.navigate('DailySchedule') }
            );
        }
        if (hasMenuAccess('elective-signup')) {
            mainMenuItems.push(
                { key: 'elective-sign-up', label: 'Elective Sign-Up', icon: 'link-outline', onPress: () => props.navigation.navigate('ElectiveSignUp') }
            );
        }
        // Keep Tiger Times paired with daily-wolf-management visibility used by web.
        if (hasMenuAccess('daily-wolf-management')) {
            mainMenuItems.push(
                { key: 'tiger-times', label: 'Tiger Times', icon: 'newspaper-outline', onPress: () => props.navigation.navigate('TigerTimes') }
            );
        }
    }

    // Role-permission items (match web AppSidebar — NOT admin-only)
    if (hasMenuAccess('awards')) {
        mainMenuItems.push({ key: 'awards', label: 'Awards', icon: 'ribbon-outline', onPress: () => props.navigation.navigate('Awards') });
    }
    if (hasMenuAccess('incidents')) {
        mainMenuItems.push({ key: 'incident-reports', label: 'Incident Reports', icon: 'warning-outline', onPress: () => props.navigation.navigate('IncidentReports') });
    }
    if (hasMenuAccess('rainy-day')) {
        mainMenuItems.push({ key: 'rainy-day-schedule', label: 'Rainy Day Schedule', icon: 'rainy-outline', onPress: () => props.navigation.navigate('RainyDaySchedule') });
    }
    if (hasMenuAccess('reports')) {
        mainMenuItems.push({ key: 'reports', label: 'Reports', icon: 'bar-chart-outline', onPress: () => props.navigation.navigate('Reports') });
    }
    if (hasMenuAccess('tutoring-therapy')) {
        mainMenuItems.push({ key: 'tutoring-therapy', label: 'Tutoring & Therapy', icon: 'book-outline', onPress: () => props.navigation.navigate('TutoringTherapy') });
    }
    if (hasMenuAccess('roster-templates')) {
        mainMenuItems.push({
            key: 'roster-templates',
            label: 'Roster Templates',
            icon: 'list-outline',
            onPress: () => props.navigation.navigate('RosterTemplates'),
        });
    }
    if (hasMenuAccess('notes')) {
        mainMenuItems.push({
            key: 'daily-news-notes',
            label: companySlug === 'tyler-hill-camp' ? 'Daily News' : 'Daily Notes',
            icon: 'document-text-outline',
            onPress: () => props.navigation.navigate('DailyNews'),
        });
    }
    if (companySlug === 'timber-lake-west') {
        if (hasMenuAccess('daily-wolf-management')) {
            mainMenuItems.push(
                { key: 'daily-wolf-management', label: 'Daily Wolf Management', icon: 'newspaper-outline', onPress: () => props.navigation.navigate('DailyWolfManagement') }
            );
        }
        if (hasMenuAccess('daily-wolf-printable')) {
            mainMenuItems.push(
                { key: 'daily-wolf-printable', label: 'Daily Wolf Printable', icon: 'document-text-outline', onPress: () => props.navigation.navigate('DailyWolfPrintable') }
            );
        }
    }
    }

    const renderDrawerItems = (
        items: Array<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }>,
    ) =>
        [...items]
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((item) => {
                const label =
                    item.key === 'messages' && inboxUnreadCount > 0
                        ? `Messages (${inboxUnreadCount > 99 ? '99+' : inboxUnreadCount})`
                        : item.label;
                return (
                    <DrawerItem
                        key={item.key}
                        label={label}
                        icon={({ color }) => <Ionicons name={item.icon} size={22} color={color} />}
                        onPress={item.onPress}
                        {...drawerItemProps}
                    />
                );
            });

    return (
        <View style={{ flex: 1, backgroundColor: menuTheme.drawerBackground }}>
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
                        style={campSwitcherStyle}
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
                                            isActive && { backgroundColor: menuTheme.dropdownSelectionBg },
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

                {/* Camp Switcher (multi-camp users) */}
                {availableCompanies.length > 1 && (
                    <View style={styles.campSwitcherWrap}>
                        <TouchableOpacity
                            style={campSwitcherStyle}
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
                                                isActive && { backgroundColor: menuTheme.dropdownSelectionBg },
                                            ]}
                                            onPress={() => {
                                                switchCompany(company.id);
                                                setShowCampPicker(false);
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

                <Text style={[styles.sectionHeader, { color: menuTheme.sectionHeader }]}>Main Menu</Text>
                {renderDrawerItems(mainMenuItems)}

                {isDayCamp && dayCampMenuItems.length > 0 && (
                    <>
                        <Text style={[styles.sectionHeader, { color: menuTheme.sectionHeader }]}>Day Camp</Text>
                        {renderDrawerItems(dayCampMenuItems)}
                    </>
                )}

                {/* ── Administration Section (Admin+) ── */}
                {canSeeAdminScreens && (
                    <>
                        <Text style={[styles.sectionHeader, { color: menuTheme.sectionHeader }]}>Administration</Text>
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
                    inactiveTintColor={menuTheme.menuItemInactive}
                />
            </View>
        </View>
    );
};

const GuardedCamperScreen = withMenuPermission('roster', CamperScreen);
const GuardedCamperDetailScreen = withMenuPermission('roster', CamperDetailScreen);
const GuardedStaffScreen = withMenuPermission('staff', StaffScreen);
const GuardedStaffDetailScreen = withMenuPermission('staff', StaffDetailScreen);
const GuardedMessagesScreen = withMenuPermission('messages', MessagesScreen);
const GuardedCalendarScreen = withMenuPermission('calendar', CalendarScreen);
const GuardedMenuScreen = withMenuPermission('menu', MenuScreen);
const GuardedAddMenuItemScreen = withMenuPermission('menu', AddMenuItemScreen);
const GuardedDailyNewsScreen = withMenuPermission('notes', DailyNewsScreen);
const GuardedActivitiesFieldTripsScreen = withMenuPermission('activities', ActivitiesFieldTripsScreen);
const GuardedSpecialEventsScreen = withMenuPermission('special-events', SpecialEventsScreen);
const GuardedRainyDayScheduleScreen = withMenuPermission('rainy-day', RainyDayScheduleScreen);

// Camper Stack Navigator
const CamperStackNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="CamperList" component={GuardedCamperScreen} />
            <Stack.Screen name="CamperDetail" component={GuardedCamperDetailScreen} />
        </Stack.Navigator>
    );
};

const StaffStackNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="StaffList" component={GuardedStaffScreen} />
            <Stack.Screen name="StaffDetail" component={GuardedStaffDetailScreen} />
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
            <Stack.Screen name="MenuList" component={GuardedMenuScreen} />
            <Stack.Screen name="AddMenuItem" component={GuardedAddMenuItemScreen} />
        </Stack.Navigator>
    );
};

// Main App Navigator (Drawer)
const MainAppNavigator = () => {
    const [realtimeUserId, setRealtimeUserId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        supabase.auth.getUser().then(({ data }) => {
            if (!cancelled) setRealtimeUserId(data.user?.id ?? null);
        });
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_evt, session) => {
            setRealtimeUserId(session?.user?.id ?? null);
        });
        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!realtimeUserId) return;
        registerInboxNotificationPresentation();
        void (async () => {
            await ensureInboxNotificationChannel();
            await requestInboxNotificationPermission();
        })();
    }, [realtimeUserId]);

    useMessagesRealtimeSync(realtimeUserId);

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
            <Drawer.Screen name="Staff" component={StaffStackNavigator} />
            <Drawer.Screen name="Calendar" component={GuardedCalendarScreen} />
            <Drawer.Screen name="Health" component={HealthScreen} />
            <Drawer.Screen name="Transport" component={TransportScreen} />
            <Drawer.Screen name="Sports" component={SportsScreen} />
            <Drawer.Screen name="SportsCalendar" component={SportsCalendarScreen} />
            <Drawer.Screen name="RainyDaySchedule" component={GuardedRainyDayScheduleScreen} />
            <Drawer.Screen name="TutoringTherapy" component={TutoringTherapyScreen} />
            <Drawer.Screen name="Reports" component={ReportsScreen} />
            <Drawer.Screen name="RosterTemplates" component={RosterTemplatesScreen} />
            <Drawer.Screen name="SpecialEvents" component={GuardedSpecialEventsScreen} />
            <Drawer.Screen name="SpecialMeals" component={SpecialMealsScreen} />
            <Drawer.Screen name="IncidentReports" component={IncidentReportsScreen} />
            <Drawer.Screen name="Menu" component={MenuStackNavigator} />
            <Drawer.Screen name="Messages" component={GuardedMessagesScreen} />
            <Drawer.Screen name="AdminPanel" component={AdminPanelScreen} />
            <Drawer.Screen name="EvaluationQuestions" component={EvaluationQuestionsScreen} />
            <Drawer.Screen name="QuestionText" component={QuestionTextScreen} />
            <Drawer.Screen name="RolePermissions" component={RolePermissionsScreen} />
            <Drawer.Screen name="DivisionPermissions" component={DivisionPermissionsScreen} />
            <Drawer.Screen name="ActivitiesFieldTrips" component={GuardedActivitiesFieldTripsScreen} />
            <Drawer.Screen name="Appointments" component={AppointmentsScreen} />
            <Drawer.Screen name="Awards" component={AwardsScreen} />
            <Drawer.Screen name="DailyNews" component={GuardedDailyNewsScreen} />
            <Drawer.Screen name="DailyWolfManagement" component={DailyWolfManagementScreen} />
            <Drawer.Screen name="DailyWolfPrintable" component={DailyWolfPrintableScreen} />
            <Drawer.Screen name="UserApprovals" component={UserApprovalsScreen} />
            <Drawer.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
            <Drawer.Screen name="AccessDenied" component={AccessDeniedScreen} />
            <Drawer.Screen name="SpecialistSportAssignments" component={SpecialistSportAssignmentsScreen} />
            <Drawer.Screen name="ODManagement" component={ODManagementScreen} />
            <Drawer.Screen name="OwlPay" component={OwlPayGateScreen} />
            <Drawer.Screen name="DailySchedule" component={DailyScheduleScreen} />
            <Drawer.Screen name="TigerTimes" component={TigerTimesScreen} />
            <Drawer.Screen name="ElectiveSignUp" component={ElectiveSignUpScreen} />
            <Drawer.Screen name="DayCampModule" component={DayCampPlaceholderScreen} />
        </Drawer.Navigator>
    );
};

// Root Navigator (Stack)
export const AppNavigator = () => {
    const [initialRouteName, setInitialRouteName] = useState<'Login' | 'MainApp' | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;
            setInitialRouteName(session ? 'MainApp' : 'Login');
        })();
        return () => {
            mounted = false;
        };
    }, []);

    if (!initialRouteName) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
                initialRouteName={initialRouteName}
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
