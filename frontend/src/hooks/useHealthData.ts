/**
 * Health data management hook
 * Handles polling BIT results, alerts, and metrics from API
 */

import { useEffect, useRef, useState } from 'react';
import { api, type BitResult, type BitAlertList, type BitHealthMetrics, type BitAlert } from '../services/api';
import { getApiMode } from '../api/config';
import { getMockBitAlerts, getMockBitMetrics, getMockBitResult } from '../mocks/mockHealth';

export interface HealthData {
  bitResult: BitResult;
  alerts: BitAlertList;
  metrics: BitHealthMetrics;
}

const DEFAULT_ALERTS: BitAlertList = {
  alerts: [],
  totalCount: 0,
};

const DEFAULT_METRICS: BitHealthMetrics = {
  windowMinutes: 240,
  snapshotCount: 0,
  operationalPercent: 100,
  degradedMinutes: 0,
  nonOpMinutes: 0,
  failureCount: 0,
  topFailingTests: [],
};

const ALERT_LIMIT = 15;
const METRICS_WINDOW_MINUTES = 240;
const ALERTS_INITIAL_LOOKBACK_MS = 60 * 60 * 1000;
const ALERTS_POLL_LOOKBACK_MS = 30 * 1000;

export const getLatestAlertTimestamp = (alerts: BitAlert[]) =>
  alerts.reduce((latest, alert) => Math.max(latest, alert.timestamp), 0);

export const mergeAlerts = (current: BitAlertList, incoming: BitAlertList): BitAlertList => {
  const alertMap = new Map<number, BitAlert>();
  current.alerts.forEach((alert) => alertMap.set(alert.id, alert));
  incoming.alerts.forEach((alert) => alertMap.set(alert.id, alert));

  const mergedAlerts = Array.from(alertMap.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return {
    alerts: mergedAlerts.slice(0, ALERT_LIMIT),
    totalCount: Math.max(current.totalCount, incoming.totalCount, mergedAlerts.length),
  };
};

export function useHealthData(): HealthData {
  const [bitResult, setBitResult] = useState<BitResult>(() => getMockBitResult());
  const [alerts, setAlerts] = useState<BitAlertList>(DEFAULT_ALERTS);
  const [metrics, setMetrics] = useState<BitHealthMetrics>(DEFAULT_METRICS);
  const lastAlertTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const apiMode = getApiMode();

    if (apiMode === 'offline') {
      // In offline mode, update periodically with new mock data
      const bitInterval = setInterval(() => {
        setBitResult(getMockBitResult());
      }, 3000);

      const auxInterval = setInterval(() => {
        setAlerts(getMockBitAlerts());
        setMetrics(getMockBitMetrics());
      }, 10000);

      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
      setAlerts(getMockBitAlerts());
      setMetrics(getMockBitMetrics());

      return () => {
        clearInterval(bitInterval);
        clearInterval(auxInterval);
      };
    }

    // Online mode - poll the API
    const fetchInitialHealth = async () => {
      try {
        const [resultData, alertsData, metricsData] = await Promise.all([
          api.getBitResults(),
          api.getBitAlerts({
            limit: ALERT_LIMIT,
            since: Date.now() - ALERTS_INITIAL_LOOKBACK_MS,
          }),
          api.getBitMetrics(METRICS_WINDOW_MINUTES), // 4 hours window
        ]);
        setBitResult(resultData);
        const mergedAlerts = mergeAlerts(DEFAULT_ALERTS, alertsData);
        setAlerts(mergedAlerts);
        setMetrics(metricsData);
        const latestTimestamp = getLatestAlertTimestamp(mergedAlerts.alerts);
        lastAlertTimestampRef.current = latestTimestamp > 0 ? latestTimestamp : Date.now();
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      }
    };

    // Initial fetch
    fetchInitialHealth();

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
        const since =
          lastAlertTimestampRef.current !== null
            ? lastAlertTimestampRef.current + 1
            : Date.now() - ALERTS_POLL_LOOKBACK_MS;
        const [alertsData, metricsData] = await Promise.all([
          api.getBitAlerts({ limit: ALERT_LIMIT, since }),
          api.getBitMetrics(METRICS_WINDOW_MINUTES),
        ]);
        setAlerts((current) => {
          const mergedAlerts = mergeAlerts(current, alertsData);
          const latestTimestamp = getLatestAlertTimestamp(mergedAlerts.alerts);
          const nextTimestamp = latestTimestamp > 0 ? latestTimestamp : Date.now();
          lastAlertTimestampRef.current = Math.max(
            lastAlertTimestampRef.current ?? 0,
            nextTimestamp
          );
          return mergedAlerts;
        });
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

  return { bitResult, alerts, metrics };
}
