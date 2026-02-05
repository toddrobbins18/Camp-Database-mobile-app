import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

export const AccessDeniedScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="shield-outline" size={80} color={theme.colors.textSecondary} />
                <Text style={styles.title}>Access Denied</Text>
                <Text style={styles.message}>
                    You don't have permission to access this page. Please contact your administrator.
                </Text>
                <TouchableOpacity 
                    style={styles.dashboardButton}
                    onPress={() => navigation.navigate('Dashboard')}
                >
                    <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    title: {
        ...theme.typography.h1,
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    message: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
    },
    dashboardButton: {
        marginTop: theme.spacing.lg,
    },
    dashboardButtonText: {
        ...theme.typography.body,
        fontSize: 16,
        color: theme.colors.secondary,
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
});

