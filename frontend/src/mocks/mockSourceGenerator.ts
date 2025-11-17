/**
 * Mock data source generator for offline/demo mode
 * Creates realistic SDR data sources to match demo tasks
 */

import type { components } from '../types/generated/api';

type DataSource = components['schemas']['DataSource'];

/**
 * Generate mock data sources for offline mode
 * These sources provide the frequencies needed by demo tasks
 */
export function generateMockSources(): DataSource[] {
  return [
    {
      id: 'source-rtlsdr-1',
      name: 'RTL-SDR #1',
      type: 'spectral',
      typeLabel: 'RTL-SDR',
      centerFrequency: 915e6, // 915 MHz - ISM Band
      sampleRate: 2.4e6,
      status: 'active',
      parentTaskId: null,
      subscriberCount: 1,
    },
    {
      id: 'source-rtlsdr-2',
      name: 'RTL-SDR #2',
      type: 'spectral',
      typeLabel: 'RTL-SDR',
      centerFrequency: 1090e6, // 1090 MHz - ADS-B
      sampleRate: 2.4e6,
      status: 'active',
      parentTaskId: null,
      subscriberCount: 1,
    },
    {
      id: 'source-hackrf',
      name: 'HackRF One',
      type: 'spectral',
      typeLabel: 'HackRF',
      centerFrequency: 433.92e6, // 433.92 MHz - ISM
      sampleRate: 8e6,
      status: 'active',
      parentTaskId: null,
      subscriberCount: 0,
    },
    {
      id: 'source-sdrplay',
      name: 'SDRplay RSP1A',
      type: 'spectral',
      typeLabel: 'SDRplay',
      centerFrequency: 145.5e6, // 145.5 MHz - 2m Ham
      sampleRate: 2e6,
      status: 'active',
      parentTaskId: null,
      subscriberCount: 1,
    },
    {
      id: 'source-airspy',
      name: 'Airspy Mini',
      type: 'spectral',
      typeLabel: 'Airspy',
      centerFrequency: 137.5e6, // 137.5 MHz - Weather Sat
      sampleRate: 3e6,
      status: 'idle',
      parentTaskId: null,
      subscriberCount: 0,
    },
    {
      id: 'source-usrp',
      name: 'USRP B200',
      type: 'spectral',
      typeLabel: 'USRP',
      centerFrequency: 2.45e9, // 2.45 GHz - WiFi/ISM
      sampleRate: 10e6,
      status: 'active',
      parentTaskId: null,
      subscriberCount: 1,
    },
  ];
}
