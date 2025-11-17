/**
 * Hook for fetching available data sources
 *
 * Fetches all available data sources from the backend API.
 * Uses React Query for caching and background updates.
 */

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/types/generated/api';
import { apiClient } from '@/api/client';

type DataSource = components['schemas']['DataSource'];

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
  // Fetch all sources
  const { data: sources = [], isLoading, error } = useQuery({
    queryKey: sourceKeys.lists(),
    queryFn: async (): Promise<DataSource[]> => {
      const { data, error } = await apiClient.GET('/api/sources/');

      if (error) {
        throw new Error('Failed to fetch data sources');
      }

      return data || [];
    },
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
