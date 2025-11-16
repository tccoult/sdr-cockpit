import {
  BitResult,
  BitStatus,
  BitTest,
  BitTreeNode,
} from '../api/health'
import {
  SystemInfo,
  SystemVersion,
} from '../types/health'

const STATUS_ORDER: Record<BitStatus, number> = {
  'unknown': 0,
  'ok': 1,
  'warn': 2,
  'fail': 3,
}

const getMostSevere = (a: BitStatus, b: BitStatus) =>
  STATUS_ORDER[a] >= STATUS_ORDER[b] ? a : b

/**
 * Mock BIT data matching the example structure from requirements
 */
export function getMockBitResult(): BitResult {
  const now = Date.now()

  const tests = [
    {
      id: 'rf-if-linearity',
      name: 'IF Output Linearity',
      status: "fail" as BitStatus,
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
      status: "warn" as BitStatus,
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
      status: "warn" as BitStatus,
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
      status: "ok" as BitStatus,
      description: 'FFT and decimation stages produced expected reference signatures.',
      lastRun: now - 1000 * 60 * 2,
      durationMs: 760,
      functionNodes: ['signal-flow', 'baseband-processing', 'dsp-pipeline'],
      hardwareNodes: ['processing-blade', 'dsp-complex'],
    },
    {
      id: 'memory-margin',
      name: 'Memory Margin Test',
      status: "ok" as BitStatus,
      description: 'DDR burst transfers completed without error at operational temperature.',
      lastRun: now - 1000 * 60 * 12,
      durationMs: 1120,
      functionNodes: ['signal-flow', 'baseband-processing', 'memory-buffering'],
      hardwareNodes: ['processing-blade', 'ddr-bank'],
    },
    {
      id: 'telemetry-link',
      name: 'Telemetry Channel Verification',
      status: "ok" as BitStatus,
      description: 'Downlink telemetry frames were acknowledged across all priority queues.',
      lastRun: now - 1000 * 60 * 5,
      durationMs: 540,
      functionNodes: ['system-services', 'telemetry'],
      hardwareNodes: ['processing-blade', 'fpga'],
    },
    {
      id: 'firmware-handshake',
      name: 'Firmware Interface Handshake',
      status: "ok" as BitStatus,
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
      if (test.status === "fail") acc.fail += 1
      else if (test.status === "warn") acc.warn += 1
      else if (test.status === "ok") acc.ok += 1
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
  } as BitResult
}

function buildAssignments(tests: BitTest[], key: 'functionNodes' | 'hardwareNodes') {
  const assignments = new Map<string, string[]>()

  tests.forEach((test) => {
    const nodes = test[key]
    if (!nodes) return

    nodes.forEach((nodeId: string) => {
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

  let status: BitStatus = assignedTests.length > 0 ? "ok" : "unknown"

  assignedTests.forEach((testId) => {
    const testStatus: BitStatus = testsById.get(testId)?.status ?? "unknown"
    status = getMostSevere(status, testStatus)
  })

  children?.forEach((child: BitTreeNode) => {
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
    status: "unknown" as BitStatus,
    children: [
      {
        id: 'signal-flow',
        name: 'Signal Flow',
        status: "unknown" as BitStatus,
        children: [
          {
            id: 'rf-path',
            name: 'RF Path',
            status: "unknown" as BitStatus,
            children: [
              {
                id: 'conversion-stage',
                name: 'Conversion Stage',
                status: "unknown" as BitStatus,
              },
              {
                id: 'gain-stabilization',
                name: 'Gain Stabilization',
                status: "unknown" as BitStatus,
              },
            ],
          },
          {
            id: 'baseband-processing',
            name: 'Baseband Processing',
            status: "unknown" as BitStatus,
            children: [
              {
                id: 'dsp-pipeline',
                name: 'DSP Pipeline',
                status: "unknown" as BitStatus,
              },
              {
                id: 'memory-buffering',
                name: 'Memory Buffering',
                status: "unknown" as BitStatus,
              },
            ],
          },
        ],
      },
      {
        id: 'timing-chain',
        name: 'Timing Chain',
        status: "unknown" as BitStatus,
        children: [
          {
            id: 'sync-control',
            name: 'Sync Control',
            status: "unknown" as BitStatus,
          },
          {
            id: 'frequency-distribution',
            name: 'Frequency Distribution',
            status: "unknown" as BitStatus,
          },
        ],
      },
      {
        id: 'system-services',
        name: 'System Services',
        status: "unknown" as BitStatus,
        children: [
          {
            id: 'firmware-interfaces',
            name: 'Firmware Interfaces',
            status: "unknown" as BitStatus,
          },
          {
            id: 'telemetry',
            name: 'Telemetry Streams',
            status: "unknown" as BitStatus,
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
    status: "unknown" as BitStatus,
    children: [
      {
        id: 'rf-frontend',
        name: 'RF Frontend',
        status: "unknown" as BitStatus,
        children: [
          {
            id: 'lna-module',
            name: 'LNA Module',
            status: "unknown" as BitStatus,
          },
          {
            id: 'attenuator-bank',
            name: 'Attenuator Bank',
            status: "unknown" as BitStatus,
          },
          {
            id: 'mixer-stage',
            name: 'Mixer Stage',
            status: "unknown" as BitStatus,
            children: [
              {
                id: 'if-output',
                name: 'IF Output Network',
                status: "unknown" as BitStatus,
              },
            ],
          },
        ],
      },
      {
        id: 'clocking',
        name: 'Clocking',
        status: "unknown" as BitStatus,
        children: [
          {
            id: 'pll-unit',
            name: 'PLL Unit',
            status: "unknown" as BitStatus,
          },
          {
            id: 'oscillator-board',
            name: 'Oscillator Board',
            status: "unknown" as BitStatus,
          },
          {
            id: 'distribution-amplifier',
            name: 'Distribution Amplifier',
            status: "unknown" as BitStatus,
          },
        ],
      },
      {
        id: 'processing-blade',
        name: 'Processing Blade',
        status: "unknown" as BitStatus,
        children: [
          {
            id: 'fpga',
            name: 'FPGA Fabric',
            status: "unknown" as BitStatus,
          },
          {
            id: 'dsp-complex',
            name: 'DSP Complex',
            status: "unknown" as BitStatus,
          },
          {
            id: 'ddr-bank',
            name: 'DDR Bank',
            status: "unknown" as BitStatus,
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
