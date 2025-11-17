/**
 * Custom hooks for SDR Cockpit
 */

export { useTasks } from './api/useTasksQuery';
export type { UseTasksResult } from './api/useTasksQuery';

export { usePlotRenderFps } from './usePlotRenderFps';

export { useHealthData } from './useHealthData';
export { useLocalStorage } from './useLocalStorage';
export { useUIPreferences } from './useUIPreferences';
export type { UIPreferences } from './useUIPreferences';
export { useMobile } from './useMobile';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export type { KeyboardShortcutsProps } from './useKeyboardShortcuts';
