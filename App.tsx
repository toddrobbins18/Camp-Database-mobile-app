import React from 'react';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Modal, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CompanyProvider } from './src/contexts/CompanyContext';
import { useAppUpdatePrompt } from './src/hooks/useAppUpdatePrompt';
import { startOfflineSyncEngine, stopOfflineSyncEngine, syncNow } from './src/offline/engine';
import { theme } from './src/theme/theme';

const AppUpdateGate = () => {
  const { isApplyingUpdate, updateStatus } = useAppUpdatePrompt();

  return (
    <Modal visible={isApplyingUpdate} transparent animationType="fade">
      <View style={updateStyles.overlay}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
        <Text style={updateStyles.title}>{updateStatus || 'Updating app…'}</Text>
        <Text style={updateStyles.subtitle}>This only takes a moment.</Text>
      </View>
    </Modal>
  );
};

const updateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

const QueryFocusSync = () => {
  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
      if (status === 'active') {
        void syncNow();
      }
    };

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      sub.remove();
    };
  }, []);

  return null;
};

const OfflineSyncBoot = () => {
  useEffect(() => {
    void startOfflineSyncEngine();
    return () => {
      stopOfflineSyncEngine();
    };
  }, []);

  return null;
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <QueryFocusSync />
        <OfflineSyncBoot />
        <AppUpdateGate />
        <CompanyProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <AppNavigator />
          </SafeAreaProvider>
        </CompanyProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

