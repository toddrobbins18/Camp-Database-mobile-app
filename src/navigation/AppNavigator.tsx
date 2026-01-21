import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CamperScreen } from '../screens/CamperScreen';
import { StaffScreen } from '../screens/StaffScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { TransportScreen } from '../screens/TransportScreen';
import { SportsScreen } from '../screens/SportsScreen';
import { theme } from '../theme/theme';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Custom Drawer Content
const CustomDrawerContent = (props: any) => {
    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
            <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
                {/* Header / Logo */}
                <View style={styles.header}>
                    <Text style={styles.logoText}>The Nest</Text>
                </View>

                {/* Year Selector Mock */}
                <View style={styles.yearSelector}>
                    <Ionicons name="calendar-outline" size={20} color="white" />
                    <Text style={styles.yearText}>2026</Text>
                    <Ionicons name="chevron-down" size={16} color="white" />
                </View>

                <Text style={styles.sectionHeader}>Main Menu</Text>

                <DrawerItem
                    label="Dashboard"
                    icon={({ color }) => <Ionicons name="home-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Dashboard')}
                    labelStyle={styles.drawerLabel}
                    activeTintColor={theme.colors.surface}
                    inactiveTintColor="#94a3b8"
                    activeBackgroundColor={theme.colors.sidebarActiveBg}
                />
                <DrawerItem
                    label="Master Calendar"
                    icon={({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Calendar')}
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
                    label="Activities & Field Trips"
                    icon={({ color }) => <Ionicons name="bonfire-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Transport')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Nurse Dashboard"
                    icon={({ color }) => <Ionicons name="medkit-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Health')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Camper"
                    icon={({ color }) => <Ionicons name="people-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Camper')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Staff"
                    icon={({ color }) => <Ionicons name="briefcase-outline" size={22} color={color} />}
                    onPress={() => props.navigation.navigate('Staff')}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
                <DrawerItem
                    label="Daily News"
                    icon={({ color }) => <Ionicons name="newspaper-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />

                <Text style={styles.sectionHeader}>Administration</Text>
                <DrawerItem
                    label="Admin Panel"
                    icon={({ color }) => <Ionicons name="shield-checkmark-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />

            </DrawerContentScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <DrawerItem
                    label="Log out"
                    icon={({ color }) => <Ionicons name="log-out-outline" size={22} color={color} />}
                    onPress={() => { }}
                    labelStyle={styles.drawerLabel}
                    inactiveTintColor="#94a3b8"
                />
            </View>
        </View>
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
            <Drawer.Screen name="Camper" component={CamperScreen} />
            <Drawer.Screen name="Staff" component={StaffScreen} />
            <Drawer.Screen name="Calendar" component={CalendarScreen} />
            <Drawer.Screen name="Health" component={HealthScreen} />
            <Drawer.Screen name="Transport" component={TransportScreen} />
            <Drawer.Screen name="Sports" component={SportsScreen} />
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
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        justifyContent: 'space-between',
    },
    yearText: {
        color: 'white',
        fontWeight: '600',
        flex: 1,
        marginLeft: theme.spacing.sm,
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
