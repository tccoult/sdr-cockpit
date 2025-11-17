/**
 * Hook for fetching available data sources
 *
 * Fetches all available data sources from the backend API or mock data in offline mode.
 * Uses React Query for caching and background updates.
 */

import { useQuery } from '@tanstack/react-query';
import { api, type DataSource } from '../../services/api/ApiService';

/**
 * Query keys for data sources
 */
export const sourceKeys = {
  all: ['sources'] as const,
  lists: () => [...sourceKeys.all, 'list'] as const,
};

/**
 * Hook for fetching and managing data sources
 */
export function useDataSources() {
  // Fetch all sources (uses api service which handles online/offline mode)
  const { data: sources = [], isLoading, error } = useQuery({
    queryKey: sourceKeys.lists(),
    queryFn: () => api.listSources(),
    // Refetch every 2 seconds to keep source status up to date
    refetchInterval: 2000,
    // Keep data fresh
    staleTime: 1000,
  });

  return {
    sources,
    isLoading,
    error,
  };
}

export type { DataSource };
