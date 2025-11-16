/**
 * Task API client
 *
 * Now using type-safe openapi-fetch client with auto-generated types.
 */

import { apiClient, Task, CreateRxTaskParams, CreateTxTaskParams } from '../api/client';
import { getApiMode } from './config';
import {
  generateDemoTasks,
  createMockRxTask,
  createMockTxTask,
  toggleTaskPause,
  startRecording as mockStartRecording,
  stopRecording as mockStopRecording,
} from '../utils/mockTaskGenerator';

/**
 * Task API interface
 */
export interface TaskApi {
  listTasks(): Promise<Task[]>;
  createRxTask(params: CreateRxTaskParams): Promise<Task>;
  createTxTask(params: CreateTxTaskParams): Promise<Task>;
  getTask(id: string): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  pauseTask(id: string): Promise<Task>;
  resumeTask(id: string): Promise<Task>;
  startRecording(id: string): Promise<Task>;
  stopRecording(id: string): Promise<Task>;
}

/**
 * Online (server-backed) task API implementation using openapi-fetch
 */
class OnlineTaskApi implements TaskApi {
  async listTasks(): Promise<Task[]> {
    const { data, error } = await apiClient.GET('/api/tasks/');
    if (error) {
      throw new Error(`Failed to list tasks: ${error}`);
    }
    return data!;
  }

  async createRxTask(params: CreateRxTaskParams): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/', {
      body: params,
    });
    if (error) {
      throw new Error(`Failed to create RX task: ${error}`);
    }
    return data!;
  }

  async createTxTask(params: CreateTxTaskParams & { file?: File }): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/', {
      body: {
        name: params.name,
        filename: params.file?.name || params.filename,
        frequency: params.frequency,
        loop: params.loop,
      },
    });
    if (error) {
      throw new Error(`Failed to create TX task: ${error}`);
    }
    return data!;
  }

  async getTask(id: string): Promise<Task> {
    const { data, error } = await apiClient.GET('/api/tasks/{task_id}', {
      params: {
        path: { task_id: id },
      },
    });
    if (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
    return data!;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await apiClient.DELETE('/api/tasks/{task_id}', {
      params: {
        path: { task_id: id },
      },
    });
    if (error) {
      throw new Error(`Failed to delete task: ${error}`);
    }
  }

  async pauseTask(id: string): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/{task_id}/pause', {
      params: {
        path: { task_id: id },
      },
    });
    if (error) {
      throw new Error(`Failed to pause task: ${error}`);
    }
    return data!;
  }

  async resumeTask(id: string): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/{task_id}/resume', {
      params: {
        path: { task_id: id },
      },
    });
    if (error) {
      throw new Error(`Failed to resume task: ${error}`);
    }
    return data!;
  }

  async startRecording(id: string): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/{task_id}/record', {
      params: {
        path: { task_id: id },
      },
    });
    if (error) {
      throw new Error(`Failed to start recording: ${error}`);
    }
    return data!;
  }

  async stopRecording(id: string): Promise<Task> {
    const { data, error } = await apiClient.DELETE('/api/tasks/{task_id}/record', {
      params: {
        path: { task_id: id },
      },
    });
    if (error) {
      throw new Error(`Failed to stop recording: ${error}`);
    }
    return data!;
  }
}

/**
 * Offline (mock) task API implementation
 */
class OfflineTaskApi implements TaskApi {
  private tasks: Map<string, Task>;

  constructor() {
    this.tasks = new Map();
    // Initialize with demo tasks
    const demoTasks = generateDemoTasks();
    demoTasks.forEach((task) => this.tasks.set(task.id, task));
  }

  async listTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async createRxTask(params: CreateRxTaskParams): Promise<Task> {
    const task = createMockRxTask(params);
    this.tasks.set(task.id, task);
    return task;
  }

  async createTxTask(params: CreateTxTaskParams & { file?: File }): Promise<Task> {
    const task = createMockTxTask({
      name: params.name,
      frequency: params.frequency || 433.92e6,
      loop: params.loop,
      filename: params.file?.name || params.filename,
    });
    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.tasks.has(id)) {
      throw new Error('Task not found');
    }
    this.tasks.delete(id);
  }

  async pauseTask(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('Task not found');
    }
    const updatedTask = toggleTaskPause(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async resumeTask(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('Task not found');
    }
    const updatedTask = toggleTaskPause(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async startRecording(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('Task not found');
    }
    const updatedTask = mockStartRecording(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async stopRecording(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('Task not found');
    }
    const updatedTask = mockStopRecording(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
}

/**
 * Get the appropriate task API based on mode
 */
export function getTaskApi(): TaskApi {
  const mode = getApiMode();
  return mode === 'online' ? new OnlineTaskApi() : new OfflineTaskApi();
}
