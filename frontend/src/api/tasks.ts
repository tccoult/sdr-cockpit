/**
 * Task API client
 */

import { Task, CreateRxTaskParams, CreateTxTaskParams } from '../types/sdr';
import { getApiBaseUrl, getApiMode } from './config';
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
 * Online (server-backed) task API implementation
 */
class OnlineTaskApi implements TaskApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/tasks`;
  }

  async listTasks(): Promise<Task[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error(`Failed to list tasks: ${response.statusText}`);
    }
    return response.json();
  }

  async createRxTask(params: CreateRxTaskParams): Promise<Task> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Failed to create RX task: ${response.statusText}`);
    }
    return response.json();
  }

  async createTxTask(params: CreateTxTaskParams): Promise<Task> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        filename: params.file.name,
        frequency: params.frequency,
        loop: params.loop,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to create TX task: ${response.statusText}`);
    }
    return response.json();
  }

  async getTask(id: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to get task: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteTask(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }
  }

  async pauseTask(id: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}/pause`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to pause task: ${response.statusText}`);
    }
    return response.json();
  }

  async resumeTask(id: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}/resume`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to resume task: ${response.statusText}`);
    }
    return response.json();
  }

  async startRecording(id: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}/record`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to start recording: ${response.statusText}`);
    }
    return response.json();
  }

  async stopRecording(id: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}/record`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to stop recording: ${response.statusText}`);
    }
    return response.json();
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

  async createTxTask(params: CreateTxTaskParams): Promise<Task> {
    const task = createMockTxTask({
      name: params.name,
      frequency: params.frequency || 433.92e6,
      loop: params.loop,
      filename: params.file.name,
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
