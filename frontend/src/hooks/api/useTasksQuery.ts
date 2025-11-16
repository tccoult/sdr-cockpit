/**
 * React Query hooks for task management
 * Replaces manual state management with automatic caching and background updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Task, CreateRxTaskParams, CreateTxTaskParams, TaskType, TaskStatus } from '../../api/client';
import { getTaskApi } from '../../api';
import { updateRecording, updateTaskUptime, updateTxProgress } from '../../utils/mockTaskGenerator';

const taskApi = getTaskApi();

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: unknown) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/**
 * Hook to fetch all tasks with auto-refresh
 * Replaces: const [tasks, setTasks] = useState([])
 */
export function useTasksQuery() {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: taskKeys.lists(),
    queryFn: () => taskApi.listTasks(),
    refetchInterval: 1500, // Auto-refresh every 1.5s
  });

  // Client-side tracking for uptimes and recordings
  const [clientTasks, setClientTasks] = useState<Task[]>([]);

  // Sync with server data
  useEffect(() => {
    if (tasks.length > 0) {
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
 * Hook to fetch a single task by ID
 */
export function useTaskQuery(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(taskId!),
    queryFn: () => taskApi.getTask(taskId!),
    enabled: !!taskId, // Only fetch if taskId exists
  });
}

/**
 * Hook for creating RX tasks
 */
export function useCreateRxTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateRxTaskParams) => taskApi.createRxTask(params),
    onSuccess: () => {
      // Invalidate tasks list to trigger refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for creating TX tasks
 */
export function useCreateTxTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTxTaskParams) => taskApi.createTxTask(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for pausing/resuming tasks
 */
export function usePauseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: TaskStatus }) => {
      return currentStatus === TaskStatus.PAUSED
        ? taskApi.resumeTask(taskId)
        : taskApi.pauseTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for deleting tasks
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for starting recording
 */
export function useStartRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.startRecording(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Hook for stopping recording
 */
export function useStopRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => taskApi.stopRecording(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * Combined hook that provides the same interface as the original useTasks
 * This maintains backward compatibility while using React Query
 */
export interface UseTasksResult {
  tasks: Task[];
  selectedTask: Task | null;
  selectedTaskId: string | null;
  isDiscovering: boolean;
  selectTask: (taskId: string) => void;
  createRxTask: (params: CreateRxTaskParams) => Promise<void>;
  createTxTask: (params: CreateTxTaskParams) => Promise<void>;
  pauseTask: (taskId: string) => Promise<void>;
  stopTask: (taskId: string) => Promise<void>;
  startRecording: (taskId: string) => Promise<void>;
  stopRecording: (taskId: string) => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const { tasks, isLoading: isDiscovering } = useTasksQuery();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const createRxMutation = useCreateRxTask();
  const createTxMutation = useCreateTxTask();
  const pauseMutation = usePauseTask();
  const deleteMutation = useDeleteTask();
  const startRecordingMutation = useStartRecording();
  const stopRecordingMutation = useStopRecording();

  // Auto-select first task on mount
  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  // Get selected task
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // Handlers that maintain the same interface
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const createRxTask = useCallback(
    async (params: CreateRxTaskParams) => {
      const result = await createRxMutation.mutateAsync(params);
      setSelectedTaskId(result.id);
    },
    [createRxMutation]
  );

  const createTxTask = useCallback(
    async (params: CreateTxTaskParams) => {
      const result = await createTxMutation.mutateAsync(params);
      setSelectedTaskId(result.id);
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

      // If this was the selected task, select another
      if (taskId === selectedTaskId) {
        const remainingTasks = tasks.filter((t) => t.id !== taskId);
        setSelectedTaskId(remainingTasks.length > 0 ? remainingTasks[0].id : null);
      }
    },
    [deleteMutation, selectedTaskId, tasks]
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
    selectedTask,
    selectedTaskId,
    isDiscovering,
    selectTask,
    createRxTask,
    createTxTask,
    pauseTask,
    stopTask,
    startRecording,
    stopRecording,
  };
}
