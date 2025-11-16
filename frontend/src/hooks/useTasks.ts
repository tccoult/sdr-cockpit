/**
 * Custom hook for task management
 * NOW USING REACT QUERY for automatic caching and background updates!
 *
 * Migration complete - this now uses React Query under the hood while
 * maintaining the same interface for backward compatibility.
 */

export type { UseTasksResult } from './api/useTasksQuery';
export { useTasks } from './api/useTasksQuery';
