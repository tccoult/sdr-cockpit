/**
 * Health data management hook
 * Handles polling BIT results from API in both online/offline modes
 */

import { useState, useEffect } from 'react';
import { api, type BitResult } from '../services/api';
import { getApiMode } from '../api/config';
import { getMockBitResult } from '../mocks/mockHealth';

export function useHealthData() {
  const [bitResult, setBitResult] = useState<BitResult>(() => getMockBitResult());

  useEffect(() => {
    const apiMode = getApiMode();

    if (apiMode === 'offline') {
      // In offline mode, update periodically with new mock data
      const interval = setInterval(() => {
        setBitResult(getMockBitResult());
      }, 3000);
      return () => clearInterval(interval);
    }

    // Online mode - poll the API
    const fetchHealth = async () => {
      try {
        const result = await api.getBitResults();
        setBitResult(result);
      } catch (error) {
        console.error('Failed to fetch BIT results:', error);
      }
    };

    // Initial fetch
    fetchHealth();

    // Poll every 3 seconds
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  return bitResult;
}
