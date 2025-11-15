/**
 * Type definitions for system health, BIT, and settings
 */

/**
 * Built-In Test (BIT) status values
 */
export enum BitStatus {
  OK = 'ok',
  WARN = 'warn',
  FAIL = 'fail',
  UNKNOWN = 'unknown',
}

/**
 * Metrics for a BIT test result
 */
export interface BitMetrics {
  expected?: string
  actual?: string
  threshold?: string
  unit?: string
}

/**
 * Atomic BIT test definition with rollup mappings.
 */
export interface BitTest {
  id: string
  name: string
  status: BitStatus
  description?: string
  lastRun?: number
  durationMs?: number
  metrics?: BitMetrics
  functionNodes: string[]
  hardwareNodes: string[]
}

/**
 * Rollup node used by functional and hardware hierarchies.
 */
export interface BitTreeNode {
  id: string
  name: string
  status: BitStatus
  description?: string
  children?: BitTreeNode[]
  tests?: string[] // IDs of tests mapped to this node
}

export interface BitSummary {
  total: number
  ok: number
  warn: number
  fail: number
}

/**
 * BIT test suite result
 */
export interface BitResult {
  timestamp: number // Unix timestamp in ms
  summary: BitSummary
  tests: BitTest[]
  functionTree: BitTreeNode
  hardwareTree: BitTreeNode
}

/**
 * System version information
 */
export interface SystemVersion {
  id: string
  name: string
  version: string
  buildDate?: string
  commitHash?: string
  children?: SystemVersion[]
}

/**
 * Complete system information
 */
export interface SystemInfo {
  version: string
  buildDate: string
  platform: string
  versionTree: SystemVersion
}

/**
 * System update file metadata
 */
export interface UpdateFile {
  file: File
  name: string
  size: number
  version?: string
  checksum?: string
}

/**
 * System update status
 */
export enum UpdateStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  VALIDATING = 'validating',
  INSTALLING = 'installing',
  COMPLETE = 'complete',
  ERROR = 'error',
}

/**
 * System update state
 */
export interface UpdateState {
  status: UpdateStatus
  progress: number // 0-100
  message: string
  error?: string
}
