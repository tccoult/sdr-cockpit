/**
 * React Query hooks for task management
 * Replaces manual state management with automatic caching and background updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Task, CreateRxTaskParams, CreateTxTaskParams, TaskType, TaskStatus } from '../../api/client';
import { api } from '../../services/api';
import { updateRecording, updateTaskUptime, updateTxProgress } from '../../mocks/mockTaskGenerator';

// Query keys (internal)
const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: unknown) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/**
 * Hook to fetch all tasks with auto-refresh (internal)
 * Replaces: const [tasks, setTasks] = useState([])
 */
function useTasksQuery() {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: taskKeys.lists(),
    queryFn: () => api.listTasks(),
    refetchInterval: 1500, // Auto-refresh every 1.5s
  });

  // Client-side tracking for uptimes and recordings
  const [clientTasks, setClientTasks] = useState<Task[]>([]);

  // Sync with server data
  useEffect(() => {
    if (tasks.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local state with server data
      setClientTasks(tasks);
    }
  }, [tasks]);

  // Update task uptimes and recordings (client-side tracking)
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setClientTasks((prevTasks) =>
        prevTasks.map((task) => {
          let updatedTask = updateTaskUptime(task);

          // Update TX progress
          if (task.type === TaskType.TX && task.status === TaskStatus.TRANSMITTING) {
            updatedTask = updateTxProgress(updatedTask, 1); // 1 second
          }

          // Update recording
          if (task.recording?.isRecording) {
            updatedTask = updateRecording(updatedTask, 1); // 1 second
          }

          return updatedTask;
        })
      );
    }, 1000);

    return () => clearInterval(updateInterval);
  }, []);

  return {
    tasks: clientTasks,
    isLoading,
    error,
  };
}

/**
 * Hook for creating RX tasks (internal)
 */
function useCreateRxTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateRxTaskParams) => api.createRxTask(params),
    onSuccess: () => {
      // Invalidate tasks list to trigger refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for creating TX tasks (internal)
 */
function useCreateTxTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTxTaskParams) => api.createTxTask(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for pausing/resuming tasks (internal)
 */
function usePauseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: TaskStatus }) => {
      return currentStatus === TaskStatus.PAUSED
        ? api.resumeTask(taskId)
        : api.pauseTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for deleting tasks (internal)
 */
function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for starting recording (internal)
 */
function useStartRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.startRecording(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for stopping recording (internal)
 */
function useStopRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.stopRecording(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Combined hook for task management
 * No longer tracks "selected task" - that concept is removed in Phase 3
 */
export interface UseTasksResult {
  tasks: Task[];
  isDiscovering: boolean;
  createRxTask: (params: CreateRxTaskParams) => Promise<Task>;
  createTxTask: (params: CreateTxTaskParams) => Promise<Task>;
  pauseTask: (taskId: string) => Promise<void>;
  stopTask: (taskId: string) => Promise<void>;
  startRecording: (taskId: string) => Promise<void>;
  stopRecording: (taskId: string) => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const { tasks, isLoading: isDiscovering } = useTasksQuery();

  const createRxMutation = useCreateRxTask();
  const createTxMutation = useCreateTxTask();
  const pauseMutation = usePauseTask();
  const deleteMutation = useDeleteTask();
  const startRecordingMutation = useStartRecording();
  const stopRecordingMutation = useStopRecording();

  const createRxTask = useCallback(
    async (params: CreateRxTaskParams): Promise<Task> => {
      return await createRxMutation.mutateAsync(params);
    },
    [createRxMutation]
  );

  const createTxTask = useCallback(
    async (params: CreateTxTaskParams): Promise<Task> => {
      return await createTxMutation.mutateAsync(params);
    },
    [createTxMutation]
  );

  const pauseTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      await pauseMutation.mutateAsync({ taskId, currentStatus: task.status });
    },
    [pauseMutation, tasks]
  );

  const stopTask = useCallback(
    async (taskId: string) => {
      await deleteMutation.mutateAsync(taskId);
    },
    [deleteMutation]
  );

  const startRecording = useCallback(
    async (taskId: string) => {
      await startRecordingMutation.mutateAsync(taskId);
    },
    [startRecordingMutation]
  );

  const stopRecording = useCallback(
    async (taskId: string) => {
      await stopRecordingMutation.mutateAsync(taskId);
    },
    [stopRecordingMutation]
  );

  return {
    tasks,
    isDiscovering,
    createRxTask,
    createTxTask,
    pauseTask,
    stopTask,
    startRecording,
    stopRecording,
  };
}
