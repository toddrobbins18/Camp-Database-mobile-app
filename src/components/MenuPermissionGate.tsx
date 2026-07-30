import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { useMenuAccess } from '../hooks/useMenuAccess';
import { AccessDeniedScreen } from '../screens/AccessDeniedScreen';

type MenuPermissionGateProps = {
    menuItem: string;
    children: React.ReactNode;
};

export function MenuPermissionGate({ menuItem, children }: MenuPermissionGateProps) {
    const navigation = useNavigation<any>();
    const { hasMenuAccess, isLoading } = useMenuAccess();

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!hasMenuAccess(menuItem)) {
        return <AccessDeniedScreen navigation={navigation} />;
    }

    return <>{children}</>;
}

export function withMenuPermission<P extends object>(menuItem: string, Screen: React.ComponentType<P>) {
    return function GuardedScreen(props: P) {
        return (
            <MenuPermissionGate menuItem={menuItem}>
                <Screen {...props} />
            </MenuPermissionGate>
        );
    };
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
});
