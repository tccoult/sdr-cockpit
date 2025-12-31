import { describe, it, expect } from 'vitest';
import { getLatestAlertTimestamp, mergeAlerts } from './useHealthData';
import type { BitAlert, BitAlertList } from '../services/api';

describe('useHealthData helpers', () => {
  describe('getLatestAlertTimestamp', () => {
    it('should return 0 for an empty array', () => {
      expect(getLatestAlertTimestamp([])).toBe(0);
    });

    it('should return the timestamp of a single alert', () => {
      const alerts: BitAlert[] = [{ id: 1, testName: 'Test Alert', severity: 'failed', timestamp: 100, testId: 'test1', message: 'error', newStatus: 'fail' }];
      expect(getLatestAlertTimestamp(alerts)).toBe(100);
    });

    it('should return the latest timestamp from multiple alerts', () => {
      const alerts: BitAlert[] = [
        { id: 1, testName: 'Test Alert 1', severity: 'failed', timestamp: 100, testId: 'test1', message: 'error', newStatus: 'fail' },
        { id: 2, testName: 'Test Alert 2', severity: 'degraded', timestamp: 200, testId: 'test2', message: 'warning', newStatus: 'warn' },
        { id: 3, testName: 'Test Alert 3', severity: 'recovered', timestamp: 150, testId: 'test3', message: 'info', newStatus: 'ok' },
      ];
      expect(getLatestAlertTimestamp(alerts)).toBe(200);
    });
  });

  describe('mergeAlerts', () => {
    const createAlert = (id: number, timestamp: number): BitAlert => ({
      id,
      timestamp,
      testName: `Alert ${id}`,
      severity: 'failed',
      testId: `test${id}`,
      message: 'An error occurred',
      newStatus: 'fail',
    });

    it('should merge incoming alerts into an empty list', () => {
      const current: BitAlertList = { alerts: [], totalCount: 0 };
      const incoming: BitAlertList = {
        alerts: [createAlert(1, 100), createAlert(2, 200)],
        totalCount: 2,
      };
      const result = mergeAlerts(current, incoming);
      expect(result.alerts).toEqual([createAlert(2, 200), createAlert(1, 100)]);
      expect(result.totalCount).toBe(2);
    });

    it('should merge new alerts into an existing list and sort correctly', () => {
      const current: BitAlertList = {
        alerts: [createAlert(2, 200), createAlert(1, 100)],
        totalCount: 2,
      };
      const incoming: BitAlertList = {
        alerts: [createAlert(3, 300), createAlert(0, 50)],
        totalCount: 2,
      };
      const result = mergeAlerts(current, incoming);
      expect(result.alerts).toEqual([
        createAlert(3, 300),
        createAlert(2, 200),
        createAlert(1, 100),
        createAlert(0, 50),
      ]);
      expect(result.totalCount).toBe(4);
    });

    it('should handle duplicates, keeping the one from the incoming list', () => {
      const current: BitAlertList = {
        alerts: [createAlert(1, 100)],
        totalCount: 1,
      };
      const incomingAlert = { ...createAlert(1, 101), message: 'Updated message' };
      const incoming: BitAlertList = {
        alerts: [incomingAlert],
        totalCount: 1,
      };
      const result = mergeAlerts(current, incoming);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toEqual(incomingAlert);
      expect(result.totalCount).toBe(1);
    });

    it('should respect the alert limit', () => {
      const currentAlerts = Array.from({ length: 10 }, (_, i) => createAlert(i, i * 10));
      const incomingAlerts = Array.from({ length: 10 }, (_, i) => createAlert(i + 10, (i + 10) * 10));
      const current: BitAlertList = { alerts: currentAlerts, totalCount: 10 };
      const incoming: BitAlertList = { alerts: incomingAlerts, totalCount: 10 };

      const result = mergeAlerts(current, incoming);
      expect(result.alerts).toHaveLength(15);
      expect(result.alerts[0].id).toBe(19);
      expect(result.totalCount).toBe(20);
    });

    it('should calculate totalCount correctly', () => {
      const current: BitAlertList = { alerts: [createAlert(1, 100)], totalCount: 5 };
      const incoming: BitAlertList = { alerts: [createAlert(2, 200)], totalCount: 8 };
      const result = mergeAlerts(current, incoming);
      expect(result.totalCount).toBe(8);

      const current2: BitAlertList = { alerts: [createAlert(1, 100)], totalCount: 10 };
      const incoming2: BitAlertList = { alerts: [createAlert(2, 200)], totalCount: 3 };
      const result2 = mergeAlerts(current2, incoming2);
      expect(result2.totalCount).toBe(10);
    });
  });
});
