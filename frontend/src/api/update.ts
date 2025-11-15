/**
 * System Update API client
 */

import { UpdateStatus } from '../types/health';
import { getApiBaseUrl, getApiMode } from './config';

export interface LockStatus {
  isLocked: boolean;
  lockedBy?: string;
  lockedSince?: number;
  expiresAt?: number;
}

export interface UploadProgress {
  uploadId: string;
  status: UpdateStatus;
  bytesReceived: number;
  totalBytes: number;
  percentComplete: number;
  validationResults?: {
    checksumValid: boolean;
    signatureValid: boolean;
    version?: string;
  };
  error?: string;
}

export interface InstallProgress {
  installId: string;
  status: UpdateStatus;
  percentComplete: number;
  timeRemainingSeconds?: number;
  currentStep?: string;
  error?: string;
}

/**
 * System Update API interface
 */
export interface UpdateApi {
  acquireLock(): Promise<{ lockId: string; expiresAt: number }>;
  getLockStatus(): Promise<LockStatus>;
  releaseLock(clientId?: string): Promise<void>;
  uploadPackage(file: File, onProgress?: (progress: number) => void): Promise<string>;
  getUploadStatus(uploadId: string): Promise<UploadProgress>;
  startInstall(uploadId: string): Promise<string>;
  getInstallStatus(installId: string): Promise<InstallProgress>;
}

/**
 * Online (server-backed) update API implementation
 */
class OnlineUpdateApi implements UpdateApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/system/update`;
  }

  async acquireLock(): Promise<{ lockId: string; expiresAt: number }> {
    const response = await fetch(`${this.baseUrl}/lock`, { method: 'POST' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Failed to acquire lock');
    }
    return response.json();
  }

  async getLockStatus(): Promise<LockStatus> {
    const response = await fetch(`${this.baseUrl}/lock`);
    if (!response.ok) {
      throw new Error(`Failed to get lock status: ${response.statusText}`);
    }
    return response.json();
  }

  async releaseLock(clientId?: string): Promise<void> {
    const url = new URL(`${this.baseUrl}/lock`);
    if (clientId) {
      url.searchParams.set('client_id', clientId);
    }
    const response = await fetch(url.toString(), { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Failed to release lock: ${response.statusText}`);
    }
  }

  async uploadPackage(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result.uploadId);
          } catch (e) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.send(formData);
    });
  }

  async getUploadStatus(uploadId: string): Promise<UploadProgress> {
    const response = await fetch(`${this.baseUrl}/upload-status/${uploadId}`);
    if (!response.ok) {
      throw new Error(`Failed to get upload status: ${response.statusText}`);
    }
    return response.json();
  }

  async startInstall(uploadId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId }),
    });
    if (!response.ok) {
      throw new Error(`Failed to start installation: ${response.statusText}`);
    }
    const result = await response.json();
    return result.installId;
  }

  async getInstallStatus(installId: string): Promise<InstallProgress> {
    const response = await fetch(`${this.baseUrl}/install-status/${installId}`);
    if (!response.ok) {
      throw new Error(`Failed to get install status: ${response.statusText}`);
    }
    return response.json();
  }
}

/**
 * Offline (mock) update API implementation
 */
class OfflineUpdateApi implements UpdateApi {
  private mockLock: { lockId: string; expiresAt: number } | null = null;
  private mockUploadId: string | null = null;
  private mockInstallId: string | null = null;

  async acquireLock(): Promise<{ lockId: string; expiresAt: number }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.mockLock = {
      lockId: `mock-${Date.now()}`,
      expiresAt: Date.now() + 20 * 60 * 1000,
    };
    return this.mockLock;
  }

  async getLockStatus(): Promise<LockStatus> {
    await new Promise(resolve => setTimeout(resolve, 50));
    if (!this.mockLock) {
      return { isLocked: false };
    }
    return {
      isLocked: true,
      lockedBy: this.mockLock.lockId,
      lockedSince: Date.now() - 1000,
      expiresAt: this.mockLock.expiresAt,
    };
  }

  async releaseLock(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this.mockLock = null;
  }

  async uploadPackage(_file: File, onProgress?: (progress: number) => void): Promise<string> {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (onProgress) {
        onProgress(i);
      }
    }
    this.mockUploadId = `mock-upload-${Date.now()}`;
    return this.mockUploadId;
  }

  async getUploadStatus(_uploadId: string): Promise<UploadProgress> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      uploadId: _uploadId,
      status: UpdateStatus.IDLE,
      bytesReceived: 1024 * 1024 * 100,
      totalBytes: 1024 * 1024 * 100,
      percentComplete: 100,
      validationResults: {
        checksumValid: true,
        signatureValid: true,
        version: '1.3.0',
      },
    };
  }

  async startInstall(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.mockInstallId = `mock-install-${Date.now()}`;
    return this.mockInstallId;
  }

  async getInstallStatus(installId: string): Promise<InstallProgress> {
    await new Promise(resolve => setTimeout(resolve, 50));
    // This would need more sophisticated state management in a real implementation
    return {
      installId,
      status: UpdateStatus.INSTALLING,
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
