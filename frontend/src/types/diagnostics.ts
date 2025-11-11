/**
 * Type definitions for system diagnostics, BIST, and settings
 */

/**
 * Built-In Self Test (BIST) status values
 */
export enum BistStatus {
  OK = 'ok',
  WARN = 'warn',
  FAIL = 'fail',
  UNKNOWN = 'unknown',
}

/**
 * Metrics for a BIST test result
 */
export interface BistMetrics {
  expected?: string
  actual?: string
  threshold?: string
  unit?: string
}

/**
 * Atomic BIST test definition with rollup mappings.
 */
export interface BistTest {
  id: string
  name: string
  status: BistStatus
  description?: string
  lastRun?: number
  durationMs?: number
  metrics?: BistMetrics
  functionNodes: string[]
  hardwareNodes: string[]
}

/**
 * Rollup node used by functional and hardware hierarchies.
 */
export interface BistTreeNode {
  id: string
  name: string
  status: BistStatus
  description?: string
  children?: BistTreeNode[]
  tests?: string[] // IDs of tests mapped to this node
}

export interface BistSummary {
  total: number
  ok: number
  warn: number
  fail: number
}

/**
 * BIST test suite result
 */
export interface BistResult {
  timestamp: number // Unix timestamp in ms
  summary: BistSummary
  tests: BistTest[]
  functionTree: BistTreeNode
  hardwareTree: BistTreeNode
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
