/**
 * Unified API Service
 *
 * Consolidates all API operations (tasks, health, update) into a single service.
 * Provides a clean, unified interface for all backend communication.
 */

import { apiClient, type Task, type CreateRxTaskParams, type CreateTxTaskParams, type components } from '../../api/client';
import { getApiBaseUrl, getApiMode } from '../../api/config';
import { getMockBitResult } from '../../mocks/mockHealth';
import {
  generateDemoTasks,
  createMockRxTask,
  createMockTxTask,
  toggleTaskPause,
  startRecording as mockStartRecording,
  stopRecording as mockStopRecording,
} from '../../mocks/mockTaskGenerator';
import { generateMockSources } from '../../mocks/mockSourceGenerator';

// Data source type
export type DataSource = components['schemas']['DataSource'];

// Re-export all API-related types for convenience
export type BitResult = components['schemas']['BitResult'];
export type BitTest = components['schemas']['BitTest'];
export type BitTreeNode = components['schemas']['BitTreeNode'];
export type BitStatus = components['schemas']['BitStatus'];
export type BitSummary = components['schemas']['BitSummary'];
export type BitMetrics = components['schemas']['BitMetrics'];
export type BitAlert = components['schemas']['BitAlert'];
export type BitAlertList = components['schemas']['BitAlertList'];
export type BitAlertSeverity = components['schemas']['BitAlertSeverity'];
export type BitHealthMetrics = components['schemas']['BitHealthMetrics'];
export type BitTestHistory = components['schemas']['BitTestHistory'];
export type TestFailureCount = components['schemas']['TestFailureCount'];
export type UpdateStatus = components['schemas']['UpdateStatus'];
export type LockStatus = components['schemas']['LockStatusResponse'];
export type UploadProgress = components['schemas']['UploadStatusResponse'];
export type InstallProgress = components['schemas']['InstallStatusResponse'];

/**
 * Unified API Service Interface
 */
export interface IApiService {
  // Task Operations
  listTasks(): Promise<Task[]>;
  createRxTask(params: CreateRxTaskParams): Promise<Task>;
  createTxTask(params: CreateTxTaskParams & { file?: File }): Promise<Task>;
  getTask(id: string): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  pauseTask(id: string): Promise<Task>;
  resumeTask(id: string): Promise<Task>;
  startRecording(id: string): Promise<Task>;
  stopRecording(id: string): Promise<Task>;

  // Source Operations
  listSources(): Promise<DataSource[]>;

  // Health Operations
  getBitResults(): Promise<BitResult>;
  getBitAlerts(params?: { since?: number; limit?: number }): Promise<BitAlertList>;
  getBitMetrics(windowMinutes?: number): Promise<BitHealthMetrics>;

  // System Update Operations
  getLockStatus(): Promise<LockStatus>;
  acquireLock(): Promise<{ lockId: string; expiresAt: number }>;
  releaseLock(lockId: string): Promise<void>;
  uploadPackage(file: File, onProgress?: (progress: number) => void): Promise<string>;
  getUploadStatus(uploadId: string): Promise<UploadProgress>;
  startInstall(uploadId: string): Promise<string>;
  getInstallStatus(installId: string): Promise<InstallProgress>;
}

/**
 * Online API Service Implementation
 * Uses type-safe openapi-fetch client for all operations
 */
class OnlineApiService implements IApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  // ==================== Task Operations ====================

  async listTasks(): Promise<Task[]> {
    const { data, error } = await apiClient.GET('/api/tasks/');
    if (error) throw new Error(`Failed to list tasks: ${error}`);
    return data!;
  }

  async createRxTask(params: CreateRxTaskParams): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/', { body: params });
    if (error) throw new Error(`Failed to create RX task: ${error}`);
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
    if (error) throw new Error(`Failed to create TX task: ${error}`);
    return data!;
  }

  async getTask(id: string): Promise<Task> {
    const { data, error } = await apiClient.GET('/api/tasks/{task_id}', {
      params: { path: { task_id: id } },
    });
    if (error) throw new Error(`Failed to get task: ${error}`);
    return data!;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await apiClient.DELETE('/api/tasks/{task_id}', {
      params: { path: { task_id: id } },
    });
    if (error) throw new Error(`Failed to delete task: ${error}`);
  }

  async pauseTask(id: string): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/{task_id}/pause', {
      params: { path: { task_id: id } },
    });
    if (error) throw new Error(`Failed to pause task: ${error}`);
    return data!;
  }

  async resumeTask(id: string): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/{task_id}/resume', {
      params: { path: { task_id: id } },
    });
    if (error) throw new Error(`Failed to resume task: ${error}`);
    return data!;
  }

  async startRecording(id: string): Promise<Task> {
    const { data, error } = await apiClient.POST('/api/tasks/{task_id}/record', {
      params: { path: { task_id: id } },
    });
    if (error) throw new Error(`Failed to start recording: ${error}`);
    return data!;
  }

  async stopRecording(id: string): Promise<Task> {
    const { data, error } = await apiClient.DELETE('/api/tasks/{task_id}/record', {
      params: { path: { task_id: id } },
    });
    if (error) throw new Error(`Failed to stop recording: ${error}`);
    return data!;
  }

  // ==================== Source Operations ====================

  async listSources(): Promise<DataSource[]> {
    const { data, error } = await apiClient.GET('/api/sources/');
    if (error) throw new Error(`Failed to list sources: ${error}`);
    return data || [];
  }

  // ==================== Health Operations ====================

  async getBitResults(): Promise<BitResult> {
    const { data, error } = await apiClient.GET('/api/health/bit/results');
    if (error) throw new Error(`Failed to get BIT results: ${error}`);
    if (!data) throw new Error('No data returned from BIT results endpoint');
    return data;
  }

  async getBitAlerts(params?: { since?: number; limit?: number }): Promise<BitAlertList> {
    const { data, error } = await apiClient.GET('/api/health/bit/alerts', {
      params: {
        query: {
          since: params?.since,
          limit: params?.limit,
        },
      },
    });
    if (error) throw new Error(`Failed to get BIT alerts: ${error}`);
    if (!data) throw new Error('No data returned from BIT alerts endpoint');
    return data;
  }

  async getBitMetrics(windowMinutes?: number): Promise<BitHealthMetrics> {
    const { data, error } = await apiClient.GET('/api/health/bit/metrics', {
      params: { query: { window_minutes: windowMinutes } },
    });
    if (error) throw new Error(`Failed to get BIT metrics: ${error}`);
    if (!data) throw new Error('No data returned from BIT metrics endpoint');
    return data;
  }

  // ==================== System Update Operations ====================

  async getLockStatus(): Promise<LockStatus> {
    const { data, error } = await apiClient.GET('/api/system/update/lock');
    if (error) throw new Error(`Failed to get lock status: ${error}`);
    if (!data) throw new Error('No data returned from lock status endpoint');
    return data;
  }

  async acquireLock(): Promise<{ lockId: string; expiresAt: number }> {
    const { data, error } = await apiClient.POST('/api/system/update/lock');
    if (error) throw new Error(`Failed to acquire lock: ${JSON.stringify(error)}`);
    if (!data) throw new Error('No data returned from acquire lock endpoint');
    return data;
  }

  async releaseLock(lockId: string): Promise<void> {
    const { error } = await apiClient.DELETE('/api/system/update/lock', {
      params: { query: { client_id: lockId } },
    });
    if (error) throw new Error(`Failed to release lock: ${JSON.stringify(error)}`);
  }

  async uploadPackage(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.uploadId);
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseUrl}/api/system/update/upload`);
      xhr.send(formData);
    });
  }

  async getUploadStatus(uploadId: string): Promise<UploadProgress> {
    const { data, error } = await apiClient.GET('/api/system/update/upload-status/{upload_id}', {
      params: { path: { upload_id: uploadId } },
    });
    if (error) throw new Error(`Failed to get upload status: ${JSON.stringify(error)}`);
    if (!data) throw new Error('No data returned from upload status endpoint');
    return data;
  }

  async startInstall(uploadId: string): Promise<string> {
    const { data, error } = await apiClient.POST('/api/system/update/install', {
      body: { upload_id: uploadId },
    });
    if (error) throw new Error(`Failed to start install: ${JSON.stringify(error)}`);
    if (!data) throw new Error('No data returned from install endpoint');
    return data.installId;
  }

  async getInstallStatus(installId: string): Promise<InstallProgress> {
    const { data, error } = await apiClient.GET('/api/system/update/install-status/{install_id}', {
      params: { path: { install_id: installId } },
    });
    if (error) throw new Error(`Failed to get install status: ${JSON.stringify(error)}`);
    if (!data) throw new Error('No data returned from install status endpoint');
    return data;
  }
}

/**
 * Offline (Mock) API Service Implementation
 * Used for development/testing without a backend
 */
class OfflineApiService implements IApiService {
  private tasks: Map<string, Task>;

  constructor() {
    this.tasks = new Map();
    const demoTasks = generateDemoTasks();
    demoTasks.forEach((task) => this.tasks.set(task.id, task));
  }

  // ==================== Task Operations ====================

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
    if (!task) throw new Error('Task not found');
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.tasks.has(id)) throw new Error('Task not found');
    this.tasks.delete(id);
  }

  async pauseTask(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    const updatedTask = toggleTaskPause(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async resumeTask(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    const updatedTask = toggleTaskPause(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async startRecording(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    const updatedTask = mockStartRecording(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async stopRecording(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    const updatedTask = mockStopRecording(task);
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // ==================== Source Operations ====================

  async listSources(): Promise<DataSource[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return generateMockSources();
  }

  // ==================== Health Operations ====================

  async getBitResults(): Promise<BitResult> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getMockBitResult();
  }

  async getBitAlerts(_params?: { since?: number; limit?: number }): Promise<BitAlertList> {
    await new Promise(resolve => setTimeout(resolve, 50));
    // Return mock empty alerts in offline mode
    return { alerts: [], totalCount: 0 };
  }

  async getBitMetrics(_windowMinutes?: number): Promise<BitHealthMetrics> {
    await new Promise(resolve => setTimeout(resolve, 50));
    // Return mock metrics in offline mode
    return {
      windowMinutes: 240,
      snapshotCount: 0,
      uptimePercent: 100,
      degradedMinutes: 0,
      nonOpMinutes: 0,
      failureCount: 0,
      topFailingTests: [],
    };
  }

  // ==================== System Update Operations ====================

  async getLockStatus(): Promise<LockStatus> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { isLocked: false, lockedBy: null, lockedSince: null, expiresAt: null };
  }

  async acquireLock(): Promise<{ lockId: string; expiresAt: number }> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { lockId: 'mock-lock-id', expiresAt: Date.now() + 300000 };
  }

  async releaseLock(_lockId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  async uploadPackage(_file: File, onProgress?: (progress: number) => void): Promise<string> {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (onProgress) onProgress(i);
    }
    return 'mock-upload-id';
  }

  async getUploadStatus(uploadId: string): Promise<UploadProgress> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      uploadId,
      status: 'complete' as const,
      bytesReceived: 1024000,
      totalBytes: 1024000,
      percentComplete: 100,
      validationResults: null,
      error: null,
    };
  }

  async startInstall(_uploadId: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'mock-install-id';
  }

  async getInstallStatus(installId: string): Promise<InstallProgress> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      installId,
      status: 'idle' as const,
      percentComplete: 0,
      timeRemainingSeconds: null,
      currentStep: 'Preparing installation...',
      error: null,
    };
  }
}

/**
 * Get the appropriate API service based on mode (online/offline)
 */
function getApiService(): IApiService {
  const mode = getApiMode();
  return mode === 'online' ? new OnlineApiService() : new OfflineApiService();
}

/**
 * Singleton API service instance
 * Import this to access all API operations
 */
export const api = getApiService();

/**
 * Default export for convenience
 */
export default api;
