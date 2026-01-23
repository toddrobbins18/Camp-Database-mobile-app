import React, { useState } from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { ActivitiesFieldTripsScreen } from '../screens/ActivitiesFieldTripsScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { AwardsScreen } from '../screens/AwardsScreen';
import { DailyNewsScreen } from '../screens/DailyNewsScreen';
import { theme } from '../theme/theme';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Custom Drawer Content
const CustomDrawerContent = (props: any) => {
    const [searchText, setSearchText] = useState('');
    const [selectedYear, setSelectedYear] = useState('2026');

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
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

                <Text style={styles.sectionHeader}>Main Menu</Text>

                <DrawerItem
                    label="Activities & Field Trips"
                    icon={({ color }) => <Ionicons name="leaf-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('ActivitiesFieldTrips')}
                    labelStyle={styles.drawerLabel}
                    activeTintColor={theme.colors.surface}
                    inactiveTintColor="#94a3b8"
                    activeBackgroundColor={theme.colors.sidebarActiveBg}
                />
                <DrawerItem
                    label="Appointments"
                    icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Appointments')}
                    labelStyle={styles.drawerLabel}
                    activeTintColor={theme.colors.surface}
                    inactiveTintColor="#94a3b8"
                    activeBackgroundColor={theme.colors.sidebarActiveBg}
                />
                <DrawerItem
                    label="Awards"
                    icon={({ color }) => <Ionicons name="ribbon-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Awards')}
                    labelStyle={styles.drawerLabel}
                    activeTintColor={theme.colors.surface}
                    inactiveTintColor="#94a3b8"
                    activeBackgroundColor={theme.colors.sidebarActiveBg}
                />
                <DrawerItem
                    label="Camper"
                    icon={({ color }) => <Ionicons name="people-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Camper')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Daily News"
                    icon={({ color }) => <Ionicons name="document-text-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('DailyNews')}
                    labelStyle={styles.drawerLabel}
                    activeTintColor={theme.colors.surface}
                    inactiveTintColor="#94a3b8"
                    activeBackgroundColor={theme.colors.sidebarActiveBg}
                />
                <DrawerItem
                    label="Dashboard"
                    icon={({ color }) => <Ionicons name="home-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Dashboard')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Incident Reports"
                    icon={({ color }) => <Ionicons name="warning-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Master Calendar"
                    icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Calendar')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Menu"
                    icon={({ color }) => <Ionicons name="restaurant-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Messages"
                    icon={({ color }) => <Ionicons name="mail-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Nurse"
                    icon={({ color }) => <Ionicons name="medical-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Health')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="OD Management"
                    icon={({ color }) => <Ionicons name="clipboard-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Rainy Day Schedule"
                    icon={({ color }) => <Ionicons name="rainy-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Reports"
                    icon={({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Roster Templates"
                    icon={({ color }) => <Ionicons name="list-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Special Events & Evening Activities"
                    icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Special Meals"
                    icon={({ color }) => <Ionicons name="restaurant-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Sports Academy"
                    icon={({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Sports')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Sports Calendar"
                    icon={({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Staff"
                    icon={({ color }) => <Ionicons name="person-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Staff')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Transportation"
                    icon={({ color }) => <Ionicons name="car-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Transport')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Tutoring & Therapy"
                    icon={({ color }) => <Ionicons name="book-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />

                <Text style={styles.sectionHeader}>Administration</Text>
                <DrawerItem
                    label="Admin Panel"
                    icon={({ color }) => <Ionicons name="shield-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Evaluation Questions"
                    icon={({ color }) => <Ionicons name="clipboard-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Role Permissions"
                    icon={({ color }) => <Ionicons name="settings-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Division Permissions"
                    icon={({ color }) => <Ionicons name="settings-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Specialist Sport Assignments"
                    icon={({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="User Approvals"
                    icon={({ color }) => <Ionicons name="checkmark-circle-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />

            </DrawerContentScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <DrawerItem
                    label="Log out"
                    icon={({ color }) => <Ionicons name="exit-outline" size={22} color={color} />}
                    onPress={() => { 
                        // TODO: Implement logout logic
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
            <Drawer.Screen name="ActivitiesFieldTrips" component={ActivitiesFieldTripsScreen} />
            <Drawer.Screen name="Appointments" component={AppointmentsScreen} />
            <Drawer.Screen name="Awards" component={AwardsScreen} />
            <Drawer.Screen name="DailyNews" component={DailyNewsScreen} />
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
    }
});
