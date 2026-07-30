import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

export function invalidateCampScopedQueries() {
  void queryClient.invalidateQueries();
}
