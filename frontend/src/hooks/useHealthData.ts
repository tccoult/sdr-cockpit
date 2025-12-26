/**
 * Health data management hook
 * Handles polling BIT results, alerts, and metrics from API
 */

import { useState, useEffect, useCallback } from 'react';
import { api, type BitResult, type BitAlertList, type BitHealthMetrics } from '../services/api';
import { getApiMode } from '../api/config';
import { getMockBitResult } from '../mocks/mockHealth';

export interface HealthData {
  bitResult: BitResult;
  alerts: BitAlertList;
  metrics: BitHealthMetrics;
  acknowledgeAlerts: (alertIds: number[]) => Promise<void>;
}

const DEFAULT_ALERTS: BitAlertList = {
  alerts: [],
  totalCount: 0,
  unacknowledgedCount: 0,
};

const DEFAULT_METRICS: BitHealthMetrics = {
  windowMinutes: 240,
  snapshotCount: 0,
  uptimePercent: 100,
  degradedMinutes: 0,
  nonOpMinutes: 0,
  failureCount: 0,
  topFailingTests: [],
};

export function useHealthData(): HealthData {
  const [bitResult, setBitResult] = useState<BitResult>(() => getMockBitResult());
  const [alerts, setAlerts] = useState<BitAlertList>(DEFAULT_ALERTS);
  const [metrics, setMetrics] = useState<BitHealthMetrics>(DEFAULT_METRICS);

  const acknowledgeAlerts = useCallback(async (alertIds: number[]) => {
    try {
      await api.acknowledgeAlerts(alertIds);
      // Refresh alerts after acknowledging
      const newAlerts = await api.getBitAlerts();
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Failed to acknowledge alerts:', error);
    }
  }, []);

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
        const [resultData, alertsData, metricsData] = await Promise.all([
          api.getBitResults(),
          api.getBitAlerts({ limit: 50 }),
          api.getBitMetrics(240), // 4 hours window
        ]);
        setBitResult(resultData);
        setAlerts(alertsData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      }
    };

    // Initial fetch
    fetchHealth();

    // Poll every 3 seconds for BIT results, 10 seconds for alerts/metrics
    const bitInterval = setInterval(async () => {
      try {
        const result = await api.getBitResults();
        setBitResult(result);
      } catch (error) {
        console.error('Failed to fetch BIT results:', error);
      }
    }, 3000);

    const alertsMetricsInterval = setInterval(async () => {
      try {
        const [alertsData, metricsData] = await Promise.all([
          api.getBitAlerts({ limit: 50 }),
          api.getBitMetrics(240),
        ]);
        setAlerts(alertsData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Failed to fetch alerts/metrics:', error);
      }
    }, 10000);

    return () => {
      clearInterval(bitInterval);
      clearInterval(alertsMetricsInterval);
    };
  }, []);

  return { bitResult, alerts, metrics, acknowledgeAlerts };
}
