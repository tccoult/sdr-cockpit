/**
 * Custom hook for task management
 * Handles loading, CRUD operations, and state management for tasks
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, CreateRxTaskParams, CreateTxTaskParams } from '../types/sdr';
import { getTaskApi } from '../api';
import { updateRecording, updateTaskUptime, updateTxProgress } from '../utils/mockTaskGenerator';

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
  const taskApi = useMemo(() => getTaskApi(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(true);

  // Load tasks from API on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsDiscovering(true);
        const loadedTasks = await taskApi.listTasks();
        setTasks(loadedTasks);

        // Auto-select first task
        if (loadedTasks.length > 0) {
          setSelectedTaskId(loadedTasks[0].id);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setIsDiscovering(false);
      }
    };

    loadTasks();
  }, [taskApi]);

  // Get selected task
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // Update task uptimes and recordings (client-side tracking)
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          let updatedTask = updateTaskUptime(task);

          // Update TX progress
          if (task.type === 'tx' && task.status === 'transmitting') {
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

  // Task handlers
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const createRxTask = useCallback(
    async (params: CreateRxTaskParams) => {
      try {
        const newTask = await taskApi.createRxTask(params);
        setTasks((prev) => [...prev, newTask]);
        setSelectedTaskId(newTask.id);
      } catch (error) {
        console.error('Failed to create RX task:', error);
        throw error;
      }
    },
    [taskApi]
  );

  const createTxTask = useCallback(
    async (params: CreateTxTaskParams) => {
      try {
        const newTask = await taskApi.createTxTask(params);
        setTasks((prev) => [...prev, newTask]);
        setSelectedTaskId(newTask.id);
      } catch (error) {
        console.error('Failed to create TX task:', error);
        throw error;
      }
    },
    [taskApi]
  );

  const pauseTask = useCallback(
    async (taskId: string) => {
      try {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const updatedTask =
          task.status === 'paused'
            ? await taskApi.resumeTask(taskId)
            : await taskApi.pauseTask(taskId);

        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      } catch (error) {
        console.error('Failed to pause/resume task:', error);
        throw error;
      }
    },
    [taskApi, tasks]
  );

  const stopTask = useCallback(
    async (taskId: string) => {
      try {
        await taskApi.deleteTask(taskId);
        setTasks((prev) => prev.filter((task) => task.id !== taskId));

        // If this was the selected task, select another
        if (taskId === selectedTaskId) {
          const remainingTasks = tasks.filter((t) => t.id !== taskId);
          setSelectedTaskId(remainingTasks.length > 0 ? remainingTasks[0].id : null);
        }
      } catch (error) {
        console.error('Failed to stop task:', error);
        throw error;
      }
    },
    [taskApi, selectedTaskId, tasks]
  );

  const startRecording = useCallback(
    async (taskId: string) => {
      try {
        const updatedTask = await taskApi.startRecording(taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
      }
    },
    [taskApi]
  );

  const stopRecording = useCallback(
    async (taskId: string) => {
      try {
        const updatedTask = await taskApi.stopRecording(taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      } catch (error) {
        console.error('Failed to stop recording:', error);
        throw error;
      }
    },
    [taskApi]
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
