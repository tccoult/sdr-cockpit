/**
 * System Update API client
 *
 * Now using type-safe openapi-fetch client with auto-generated types.
 */

import { apiClient, type components } from './client';
import { getApiBaseUrl, getApiMode } from './config';

// Re-export generated types from OpenAPI schema
export type UpdateStatus = components['schemas']['UpdateStatus'];
export type LockStatus = components['schemas']['LockStatusResponse'];
export type UploadProgress = components['schemas']['UploadStatusResponse'];
export type InstallProgress = components['schemas']['InstallStatusResponse'];

/**
 * Update API interface
 */
export interface UpdateApi {
  getLockStatus(): Promise<LockStatus>;
  acquireLock(): Promise<{ lockId: string; expiresAt: number }>;
  releaseLock(lockId: string): Promise<void>;
  uploadPackage(file: File, onProgress?: (progress: number) => void): Promise<string>;
  getUploadStatus(uploadId: string): Promise<UploadProgress>;
  startInstall(uploadId: string): Promise<string>;
  getInstallStatus(installId: string): Promise<InstallProgress>;
}

/**
 * Online (server-backed) update API using type-safe client
 */
class OnlineUpdateApi implements UpdateApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/system/update`;
  }

  async getLockStatus(): Promise<LockStatus> {
    const { data, error } = await apiClient.GET('/api/system/update/lock');

    if (error) {
      throw new Error(`Failed to get lock status: ${error}`);
    }

    if (!data) {
      throw new Error('No data returned from lock status endpoint');
    }

    return data;
  }

  async acquireLock(): Promise<{ lockId: string; expiresAt: number }> {
    const { data, error } = await apiClient.POST('/api/system/update/lock');

    if (error) {
      throw new Error(`Failed to acquire lock: ${JSON.stringify(error)}`);
    }

    if (!data) {
      throw new Error('No data returned from acquire lock endpoint');
    }

    return data;
  }

  async releaseLock(lockId: string): Promise<void> {
    const { error } = await apiClient.DELETE('/api/system/update/lock', {
      params: { query: { client_id: lockId } },
    });

    if (error) {
      throw new Error(`Failed to release lock: ${JSON.stringify(error)}`);
    }
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
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.send(formData);
    });
  }

  async getUploadStatus(uploadId: string): Promise<UploadProgress> {
    const { data, error } = await apiClient.GET('/api/system/update/upload-status/{upload_id}', {
      params: { path: { upload_id: uploadId } },
    });

    if (error) {
      throw new Error(`Failed to get upload status: ${JSON.stringify(error)}`);
    }

    if (!data) {
      throw new Error('No data returned from upload status endpoint');
    }

    return data;
  }

  async startInstall(uploadId: string): Promise<string> {
    const { data, error } = await apiClient.POST('/api/system/update/install', {
      body: { upload_id: uploadId },
    });

    if (error) {
      throw new Error(`Failed to start install: ${JSON.stringify(error)}`);
    }

    if (!data) {
      throw new Error('No data returned from start install endpoint');
    }

    return data.installId;
  }

  async getInstallStatus(installId: string): Promise<InstallProgress> {
    const { data, error } = await apiClient.GET('/api/system/update/install-status/{install_id}', {
      params: { path: { install_id: installId } },
    });

    if (error) {
      throw new Error(`Failed to get install status: ${JSON.stringify(error)}`);
    }

    if (!data) {
      throw new Error('No data returned from install status endpoint');
    }

    return data;
  }
}

/**
 * Offline (mock) update API implementation
 */
class OfflineUpdateApi implements UpdateApi {
  private mockLockId: string | null = null;
  private mockUploadId: string | null = null;
  private mockInstallId: string | null = null;

  async getLockStatus(): Promise<LockStatus> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      isLocked: this.mockLockId !== null,
      lockedBy: this.mockLockId,
      lockedSince: this.mockLockId ? Date.now() - 5000 : null,
      expiresAt: this.mockLockId ? Date.now() + 1200000 : null,
    };
  }

  async acquireLock(): Promise<{ lockId: string; expiresAt: number }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.mockLockId = `mock-lock-${Date.now()}`;
    return {
      lockId: this.mockLockId,
      expiresAt: Date.now() + 1200000,
    };
  }

  async releaseLock(lockId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    if (this.mockLockId === lockId) {
      this.mockLockId = null;
    }
  }

  async uploadPackage(_file: File, onProgress?: (progress: number) => void): Promise<string> {
    // Simulate upload progress
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (onProgress) {
        onProgress((i / steps) * 100);
      }
    }
    this.mockUploadId = `mock-upload-${Date.now()}`;
    return this.mockUploadId;
  }

  async getUploadStatus(_uploadId: string): Promise<UploadProgress> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      uploadId: _uploadId,
      status: 'idle',
      bytesReceived: 100000,
      totalBytes: 100000,
      percentComplete: 100,
      validationResults: {
        checksumValid: true,
        signatureValid: true,
        version: '1.0.0',
      },
    };
  }

  async startInstall(_: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.mockInstallId = `mock-install-${Date.now()}`;
    return this.mockInstallId;
  }

  async getInstallStatus(installId: string): Promise<InstallProgress> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      installId,
      status: 'installing',
      percentComplete: 50,
      timeRemainingSeconds: 15,
      currentStep: 'Updating',
    };
  }
}

/**
 * Get the appropriate update API based on mode
 */
export function getUpdateApi(): UpdateApi {
  const mode = getApiMode();
  return mode === 'online' ? new OnlineUpdateApi() : new OfflineUpdateApi();
}
