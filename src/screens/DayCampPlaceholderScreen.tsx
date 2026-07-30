import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { DAY_CAMP_MODULE_COPY } from '../constants/dayCampMenu';

type DayCampModuleParams = {
  DayCampModule: { moduleId?: string };
};

export function DayCampPlaceholderScreen({ navigation }: any) {
  const route = useRoute<RouteProp<DayCampModuleParams, 'DayCampModule'>>();
  const moduleId = route.params?.moduleId ?? '';
  const copy = DAY_CAMP_MODULE_COPY[moduleId] ?? {
    title: 'Day Camp',
    description: 'This module is not available yet.',
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
        <Text style={styles.message}>{copy.description}</Text>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 22,
  },
  dashboardButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  dashboardButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
