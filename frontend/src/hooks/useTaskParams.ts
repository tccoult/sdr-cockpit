/**
 * Hook for managing task-related URL parameters
 * Enables shareable links, browser back/forward, and bookmarkable task selection
 */

import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useTaskParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get selectedTaskId from URL
  const selectedTaskId = searchParams.get('task');

  // Set selectedTaskId in URL
  const selectTask = useCallback(
    (taskId: string | null) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (taskId) {
          newParams.set('task', taskId);
        } else {
          newParams.delete('task');
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  return {
    selectedTaskId,
    selectTask,
  };
}
