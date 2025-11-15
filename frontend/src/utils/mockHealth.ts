import {
  BitResult,
  BitStatus,
  BitTest,
  BitTreeNode,
  SystemInfo,
  SystemVersion,
} from '../types/health'

const STATUS_ORDER: Record<BitStatus, number> = {
  [BitStatus.UNKNOWN]: 0,
  [BitStatus.OK]: 1,
  [BitStatus.WARN]: 2,
  [BitStatus.FAIL]: 3,
}

const getMostSevere = (a: BitStatus, b: BitStatus) =>
  STATUS_ORDER[a] >= STATUS_ORDER[b] ? a : b

/**
 * Mock BIT data matching the example structure from requirements
 */
export function getMockBitResult(): BitResult {
  const now = Date.now()

  const tests: BitTest[] = [
    {
      id: 'rf-if-linearity',
      name: 'IF Output Linearity',
      status: BitStatus.FAIL,
      description: 'Mixer IF output amplitude dropped below the minimum threshold.',
      lastRun: now - 1000 * 60 * 3,
      durationMs: 1320,
      metrics: {
        expected: '1.0',
        actual: '0.24',
        threshold: '0.8',
        unit: 'V',
      },
      functionNodes: ['signal-flow', 'rf-path', 'conversion-stage'],
      hardwareNodes: ['rf-frontend', 'mixer-stage', 'if-output'],
    },
    {
      id: 'clock-discipline',
      name: 'Clock PLL Discipline',
      status: BitStatus.WARN,
      description: 'PLL lock acquisition exceeded nominal settling time.',
      lastRun: now - 1000 * 60 * 7,
      durationMs: 980,
      metrics: {
        expected: '12',
        actual: '18',
        threshold: '15',
        unit: 'ms',
      },
      functionNodes: ['timing-chain', 'sync-control'],
      hardwareNodes: ['clocking', 'pll-unit'],
    },
    {
      id: 'gps-holdover',
      name: 'GPS Holdover Stability',
      status: BitStatus.WARN,
      description: 'Oscillator drift is elevated while operating in holdover mode.',
      lastRun: now - 1000 * 60 * 15,
      durationMs: 1430,
      metrics: {
        expected: '0.25',
        actual: '0.42',
        threshold: '0.35',
        unit: 'ppm',
      },
      functionNodes: ['timing-chain', 'frequency-distribution'],
      hardwareNodes: ['clocking', 'oscillator-board'],
    },
    {
      id: 'dsp-integrity',
      name: 'DSP Pipeline Integrity',
      status: BitStatus.OK,
      description: 'FFT and decimation stages produced expected reference signatures.',
      lastRun: now - 1000 * 60 * 2,
      durationMs: 760,
      functionNodes: ['signal-flow', 'baseband-processing', 'dsp-pipeline'],
      hardwareNodes: ['processing-blade', 'dsp-complex'],
    },
    {
      id: 'memory-margin',
      name: 'Memory Margin Test',
      status: BitStatus.OK,
      description: 'DDR burst transfers completed without error at operational temperature.',
      lastRun: now - 1000 * 60 * 12,
      durationMs: 1120,
      functionNodes: ['signal-flow', 'baseband-processing', 'memory-buffering'],
      hardwareNodes: ['processing-blade', 'ddr-bank'],
    },
    {
      id: 'telemetry-link',
      name: 'Telemetry Channel Verification',
      status: BitStatus.OK,
      description: 'Downlink telemetry frames were acknowledged across all priority queues.',
      lastRun: now - 1000 * 60 * 5,
      durationMs: 540,
      functionNodes: ['system-services', 'telemetry'],
      hardwareNodes: ['processing-blade', 'fpga'],
    },
    {
      id: 'firmware-handshake',
      name: 'Firmware Interface Handshake',
      status: BitStatus.OK,
      description: 'Control plane firmware responded with synchronized sequence IDs.',
      lastRun: now - 1000 * 60 * 9,
      durationMs: 680,
      functionNodes: ['system-services', 'firmware-interfaces'],
      hardwareNodes: ['processing-blade', 'fpga'],
    },
  ]

  const testsById = new Map(tests.map((test) => [test.id, test]))

  const functionAssignments = buildAssignments(tests, 'functionNodes')
  const hardwareAssignments = buildAssignments(tests, 'hardwareNodes')

  const functionTree = rollupTree(createFunctionTree(), functionAssignments, testsById)
  const hardwareTree = rollupTree(createHardwareTree(), hardwareAssignments, testsById)

  const summary = tests.reduce(
    (acc, test) => {
      acc.total += 1
      if (test.status === BitStatus.FAIL) acc.fail += 1
      else if (test.status === BitStatus.WARN) acc.warn += 1
      else if (test.status === BitStatus.OK) acc.ok += 1
      return acc
    },
    { total: 0, ok: 0, warn: 0, fail: 0 }
  )

  return {
    timestamp: now,
    summary,
    tests,
    functionTree,
    hardwareTree,
  }
}

function buildAssignments(tests: BitTest[], key: 'functionNodes' | 'hardwareNodes') {
  const assignments = new Map<string, string[]>()

  tests.forEach((test) => {
    test[key].forEach((nodeId) => {
      const existing = assignments.get(nodeId) ?? []
      if (!existing.includes(test.id)) {
        existing.push(test.id)
        assignments.set(nodeId, existing)
      }
    })
  })

  return assignments
}

function rollupTree(
  node: BitTreeNode,
  assignments: Map<string, string[]>,
  testsById: Map<string, BitTest>
): BitTreeNode {
  const children = node.children?.map((child) => rollupTree(child, assignments, testsById))
  const assignedTests = assignments.get(node.id) ?? []

  let status = assignedTests.length > 0 ? BitStatus.OK : BitStatus.UNKNOWN

  assignedTests.forEach((testId) => {
    const testStatus = testsById.get(testId)?.status ?? BitStatus.UNKNOWN
    status = getMostSevere(status, testStatus)
  })

  children?.forEach((child) => {
    status = getMostSevere(status, child.status)
  })

  return {
    ...node,
    status,
    children,
    tests: assignedTests.length > 0 ? assignedTests : undefined,
  }
}

function createFunctionTree(): BitTreeNode {
  return {
    id: 'system-functions',
    name: 'System Functions',
    status: BitStatus.UNKNOWN,
    children: [
      {
        id: 'signal-flow',
        name: 'Signal Flow',
        status: BitStatus.UNKNOWN,
        children: [
          {
            id: 'rf-path',
            name: 'RF Path',
            status: BitStatus.UNKNOWN,
            children: [
              {
                id: 'conversion-stage',
                name: 'Conversion Stage',
                status: BitStatus.UNKNOWN,
              },
              {
                id: 'gain-stabilization',
                name: 'Gain Stabilization',
                status: BitStatus.UNKNOWN,
              },
            ],
          },
          {
            id: 'baseband-processing',
            name: 'Baseband Processing',
            status: BitStatus.UNKNOWN,
            children: [
              {
                id: 'dsp-pipeline',
                name: 'DSP Pipeline',
                status: BitStatus.UNKNOWN,
              },
              {
                id: 'memory-buffering',
                name: 'Memory Buffering',
                status: BitStatus.UNKNOWN,
              },
            ],
          },
        ],
      },
      {
        id: 'timing-chain',
        name: 'Timing Chain',
        status: BitStatus.UNKNOWN,
        children: [
          {
            id: 'sync-control',
            name: 'Sync Control',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'frequency-distribution',
            name: 'Frequency Distribution',
            status: BitStatus.UNKNOWN,
          },
        ],
      },
      {
        id: 'system-services',
        name: 'System Services',
        status: BitStatus.UNKNOWN,
        children: [
          {
            id: 'firmware-interfaces',
            name: 'Firmware Interfaces',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'telemetry',
            name: 'Telemetry Streams',
            status: BitStatus.UNKNOWN,
          },
        ],
      },
    ],
  }
}

function createHardwareTree(): BitTreeNode {
  return {
    id: 'chassis',
    name: 'Chassis',
    status: BitStatus.UNKNOWN,
    children: [
      {
        id: 'rf-frontend',
        name: 'RF Frontend',
        status: BitStatus.UNKNOWN,
        children: [
          {
            id: 'lna-module',
            name: 'LNA Module',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'attenuator-bank',
            name: 'Attenuator Bank',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'mixer-stage',
            name: 'Mixer Stage',
            status: BitStatus.UNKNOWN,
            children: [
              {
                id: 'if-output',
                name: 'IF Output Network',
                status: BitStatus.UNKNOWN,
              },
            ],
          },
        ],
      },
      {
        id: 'clocking',
        name: 'Clocking',
        status: BitStatus.UNKNOWN,
        children: [
          {
            id: 'pll-unit',
            name: 'PLL Unit',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'oscillator-board',
            name: 'Oscillator Board',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'distribution-amplifier',
            name: 'Distribution Amplifier',
            status: BitStatus.UNKNOWN,
          },
        ],
      },
      {
        id: 'processing-blade',
        name: 'Processing Blade',
        status: BitStatus.UNKNOWN,
        children: [
          {
            id: 'fpga',
            name: 'FPGA Fabric',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'dsp-complex',
            name: 'DSP Complex',
            status: BitStatus.UNKNOWN,
          },
          {
            id: 'ddr-bank',
            name: 'DDR Bank',
            status: BitStatus.UNKNOWN,
          },
        ],
      },
    ],
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
