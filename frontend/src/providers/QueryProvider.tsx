/**
 * React Query Provider
 *
 * Provides React Query client to the entire app for server state management.
 * Includes DevTools for development debugging.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered stale after 1 second
      staleTime: 1000,
      // Don't refetch on window focus (we're using refetchInterval instead)
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Consider data fresh for 500ms to prevent excessive refetching
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only included in development builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
