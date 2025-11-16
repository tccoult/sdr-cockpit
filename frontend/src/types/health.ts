/**
 * System health and version types
 *
 * NOTE: BIT (Built-In Test) types are now auto-generated from OpenAPI spec.
 * Import BIT types from: import { BitResult, BitTest, ... } from '../api/health'
 */

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
