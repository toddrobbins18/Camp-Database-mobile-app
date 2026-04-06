import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

interface StyledCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const StyledCard: React.FC<StyledCardProps> = ({ children, style }) => {
    return (
        <View style={[styles.card, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
});
