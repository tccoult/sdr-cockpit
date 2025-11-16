/**
 * Health (BIT) API client
 *
 * Now using type-safe openapi-fetch client with auto-generated types.
 */

import { apiClient, type components } from './client';
import { getApiMode } from './config';
import { getMockBitResult } from '../utils/mockHealth';

// Re-export generated types from OpenAPI schema for convenience
export type BitResult = components['schemas']['BitResult'];
export type BitTest = components['schemas']['BitTest'];
export type BitTreeNode = components['schemas']['BitTreeNode'];
export type BitStatus = components['schemas']['BitStatus'];
export type BitSummary = components['schemas']['BitSummary'];
export type BitMetrics = components['schemas']['BitMetrics'];

/**
 * Health API interface
 */
export interface HealthApi {
  getBitResults(): Promise<BitResult>;
}

/**
 * Online (server-backed) health API implementation using type-safe client
 */
class OnlineHealthApi implements HealthApi {
  async getBitResults(): Promise<BitResult> {
    const { data, error } = await apiClient.GET('/api/health/bit/results');

    if (error) {
      throw new Error(`Failed to get BIT results: ${error}`);
    }

    if (!data) {
      throw new Error('No data returned from BIT results endpoint');
    }

    return data;
  }
}

/**
 * Offline (mock) health API implementation
 */
class OfflineHealthApi implements HealthApi {
  async getBitResults(): Promise<BitResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return getMockBitResult();
  }
}

/**
 * Get the appropriate health API based on mode
 */
export function getHealthApi(): HealthApi {
  const mode = getApiMode();
  return mode === 'online' ? new OnlineHealthApi() : new OfflineHealthApi();
}

/**
 * Convenience function to get BIT results
 */
export async function getBitResults(): Promise<BitResult> {
  const api = getHealthApi();
  return api.getBitResults();
}
