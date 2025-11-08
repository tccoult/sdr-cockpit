import { BistResult, BistNode, BistStatus, SystemInfo, SystemVersion } from '../types/diagnostics'

/**
 * Mock BIST data matching the example structure from requirements
 */
export function getMockBistResult(): BistResult {
  const tree: BistNode = {
    id: 'system',
    name: 'System',
    status: BistStatus.FAIL,
    children: [
      {
        id: 'rf-frontend',
        name: 'RF Frontend',
        status: BistStatus.FAIL,
        children: [
          {
            id: 'lna',
            name: 'LNA',
            status: BistStatus.OK,
          },
          {
            id: 'mixer',
            name: 'Mixer',
            status: BistStatus.FAIL,
            children: [
              {
                id: 'mixer-bias',
                name: 'Bias Rail',
                status: BistStatus.OK,
              },
              {
                id: 'mixer-if-output',
                name: 'IF Output',
                status: BistStatus.FAIL,
                details: 'Voltage out of acceptable range',
                metrics: {
                  expected: '1.0',
                  actual: '0.24',
                  threshold: '0.8',
                  unit: 'V',
                },
              },
            ],
          },
          {
            id: 'adc',
            name: 'ADC',
            status: BistStatus.OK,
          },
        ],
      },
      {
        id: 'timing',
        name: 'Timing',
        status: BistStatus.WARN,
        children: [
          {
            id: 'pps-lock',
            name: 'PPS Lock',
            status: BistStatus.OK,
          },
          {
            id: 'gpsdo',
            name: 'GPSDO',
            status: BistStatus.WARN,
            details: 'GPS signal strength below optimal threshold',
            metrics: {
              expected: '45',
              actual: '38',
              threshold: '40',
              unit: 'dBHz',
            },
          },
        ],
      },
      {
        id: 'processing',
        name: 'Processing',
        status: BistStatus.OK,
        children: [
          {
            id: 'fpga',
            name: 'FPGA',
            status: BistStatus.OK,
          },
          {
            id: 'dsp',
            name: 'DSP Core',
            status: BistStatus.OK,
          },
          {
            id: 'memory',
            name: 'Memory',
            status: BistStatus.OK,
          },
        ],
      },
      {
        id: 'communications',
        name: 'Communications',
        status: BistStatus.OK,
        children: [
          {
            id: 'ethernet',
            name: 'Ethernet',
            status: BistStatus.OK,
          },
          {
            id: 'usb',
            name: 'USB',
            status: BistStatus.OK,
          },
        ],
      },
    ],
  }

  // Count statuses recursively
  function countStatuses(node: BistNode): { ok: number; warn: number; fail: number } {
    let ok = 0
    let warn = 0
    let fail = 0

    if (!node.children || node.children.length === 0) {
      // Leaf node
      if (node.status === BistStatus.OK) ok++
      else if (node.status === BistStatus.WARN) warn++
      else if (node.status === BistStatus.FAIL) fail++
    } else {
      // Branch node - count children
      node.children.forEach((child) => {
        const counts = countStatuses(child)
        ok += counts.ok
        warn += counts.warn
        fail += counts.fail
      })
    }

    return { ok, warn, fail }
  }

  const counts = countStatuses(tree)

  return {
    timestamp: Date.now(),
    summary: {
      total: counts.ok + counts.warn + counts.fail,
      ok: counts.ok,
      warn: counts.warn,
      fail: counts.fail,
    },
    tree,
  }
}

/**
 * Mock system version information
 */
export function getMockSystemInfo(): SystemInfo {
  const versionTree: SystemVersion = {
    id: 'sdr-cockpit',
    name: 'SDR Cockpit',
    version: '1.2.0',
    buildDate: '2025-01-15',
    commitHash: 'a1b2c3d',
    children: [
      {
        id: 'frontend',
        name: 'Frontend',
        version: '1.2.0',
        buildDate: '2025-01-15',
        commitHash: 'a1b2c3d',
      },
      {
        id: 'backend',
        name: 'Backend',
        version: '1.2.0',
        buildDate: '2025-01-15',
        commitHash: 'a1b2c3d',
        children: [
          {
            id: 'api',
            name: 'API Server',
            version: '1.2.0',
            commitHash: 'a1b2c3d',
          },
          {
            id: 'websocket',
            name: 'WebSocket Server',
            version: '1.2.0',
            commitHash: 'a1b2c3d',
          },
        ],
      },
      {
        id: 'sdr-driver',
        name: 'SDR Driver',
        version: '2.4.1',
        buildDate: '2024-12-10',
        commitHash: 'x9y8z7w',
      },
      {
        id: 'fpga-firmware',
        name: 'FPGA Firmware',
        version: '3.1.0',
        buildDate: '2024-11-22',
        commitHash: 'f1e2d3c',
      },
    ],
  }

  return {
    version: '1.2.0',
    buildDate: '2025-01-15T10:30:00Z',
    platform: 'Linux x86_64',
    versionTree,
  }
}
