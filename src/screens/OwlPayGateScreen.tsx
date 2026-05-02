import React from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useCompany } from '../contexts/CompanyContext';
import { theme } from '../theme/theme';
import { OwlPayScreen } from './OwlPayScreen';

/**
 * Owl Pay is only for camps with `companies.owl_pay_enabled` (Tyler Hill in production).
 * Super-admins can land here after switching companies from the drawer; show a clear
 * message instead of an empty POS.
 */
export function OwlPayGateScreen({ navigation }: { navigation: any }) {
    const { owlPayEnabled, isLoading, companyId } = useCompany();

    if (isLoading || !companyId) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.secondary} />
            </View>
        );
    }

    if (!owlPayEnabled) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centered}>
                    <Text style={styles.title}>Owl Pay isn’t available</Text>
                    <Text style={styles.body}>
                        Owl Pay is only enabled for Tyler Hill Camp. Timber Lake Camp and Timber Lake West
                        don’t use this module — open the dashboard for the camp you selected.
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => navigation.navigate('Dashboard')}
                        accessibilityRole="button"
                        accessibilityLabel="Go to dashboard"
                    >
                        <Text style={styles.buttonText}>Go to dashboard</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return <OwlPayScreen navigation={navigation} />;
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    title: {
        ...theme.typography.h2,
        textAlign: 'center',
    },
    body: {
        ...theme.typography.bodySmall,
        textAlign: 'center',
        color: theme.colors.textSecondary,
        maxWidth: 340,
    },
    button: {
        marginTop: theme.spacing.md,
        backgroundColor: theme.colors.secondary,
        paddingVertical: theme.spacing.sm + 4,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.md,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
