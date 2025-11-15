/**
 * Health (BIT) API client
 */

import { BitResult } from '../types/health';
import { getApiBaseUrl, getApiMode } from './config';
import { getMockBitResult } from '../utils/mockHealth';

/**
 * Health API interface
 */
export interface HealthApi {
  getBitResults(): Promise<BitResult>;
}

/**
 * Online (server-backed) health API implementation
 */
class OnlineHealthApi implements HealthApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/health`;
  }

  async getBitResults(): Promise<BitResult> {
    const response = await fetch(`${this.baseUrl}/bit/results`);
    if (!response.ok) {
      throw new Error(`Failed to get BIT results: ${response.statusText}`);
    }
    return response.json();
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
