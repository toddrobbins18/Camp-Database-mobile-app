import React from 'react';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CompanyProvider } from './src/contexts/CompanyContext';
import { useAppUpdatePrompt } from './src/hooks/useAppUpdatePrompt';
import { startOfflineSyncEngine, stopOfflineSyncEngine, syncNow } from './src/offline/engine';

const AppUpdateGate = () => {
  useAppUpdatePrompt();
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data reasonably fresh across screens/apps without changing workflows.
      staleTime: 5000,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
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

