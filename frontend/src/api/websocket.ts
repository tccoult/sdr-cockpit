/**
 * WebSocket client with auto-reconnection
 */

import { FFTData } from '../types/sdr';
import { getWsBaseUrl, getApiMode } from './config';
import { MockFFTGenerator } from '../utils/mockDataGenerator';

export type DataStreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface DataStreamCallbacks {
  onData: (data: FFTData) => void;
  onStatusChange: (status: DataStreamStatus) => void;
  onError?: (error: string) => void;
}

/**
 * Online (WebSocket) data stream
 */
class OnlineDataStream {
  private ws: WebSocket | null = null;
  private taskId: string;
  private callbacks: DataStreamCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private isManualClose = false;

  constructor(taskId: string, callbacks: DataStreamCallbacks) {
    this.taskId = taskId;
    this.callbacks = callbacks;
    this.connect();
  }

  private connect(): void {
    this.callbacks.onStatusChange('connecting');
    const wsUrl = `${getWsBaseUrl()}/ws/tasks/${this.taskId}/data`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onStatusChange('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Check for error messages from server
          if (data.error) {
            this.callbacks.onStatusChange('error');
            this.callbacks.onError?.(data.error);
            return;
          }

          // Convert bins array to Float32Array if needed
          if (Array.isArray(data.bins)) {
            data.bins = new Float32Array(data.bins);
          }

          this.callbacks.onData(data as FFTData);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onStatusChange('error');
      };

      this.ws.onclose = () => {
        this.ws = null;

        // Don't reconnect if manually closed
        if (this.isManualClose) {
          this.callbacks.onStatusChange('disconnected');
          return;
        }

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.callbacks.onStatusChange('connecting');
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

          this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          // Max reconnect attempts reached
          this.callbacks.onStatusChange('error');
          this.callbacks.onError?.('Failed to connect to data stream after multiple attempts');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.callbacks.onStatusChange('error');
      this.callbacks.onError?.('Failed to create WebSocket connection');
    }
  }

  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.onStatusChange('disconnected');
  }
}

/**
 * Offline (mock) data stream using MockFFTGenerator
 */
class OfflineDataStream {
  private generator: MockFFTGenerator;
  private intervalId: number | null = null;
  private callbacks: DataStreamCallbacks;

  constructor(
    _taskId: string,
    callbacks: DataStreamCallbacks,
    centerFreq: number,
    sampleRate: number,
    fftSize: number = 2048
  ) {
    this.callbacks = callbacks;
    this.generator = new MockFFTGenerator(centerFreq, sampleRate, fftSize);
    this.start();
  }

  private start(): void {
    this.callbacks.onStatusChange('connected');

    // Generate and send FFT data at ~60 FPS
    this.intervalId = window.setInterval(() => {
      const fftData = this.generator.generateFFT();
      this.callbacks.onData(fftData);
    }, 1000 / 60);
  }

  disconnect(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callbacks.onStatusChange('disconnected');
  }

  updateFrequency(freq: number): void {
    this.generator.setCenterFreq(freq);
  }

  updateSampleRate(rate: number): void {
    this.generator.setSampleRate(rate);
  }
}

/**
 * Create a data stream based on API mode
 */
export function createDataStream(
  taskId: string,
  callbacks: DataStreamCallbacks,
  options?: {
    centerFreq?: number;
    sampleRate?: number;
    fftSize?: number;
  }
): { disconnect: () => void } {
  const mode = getApiMode();

  if (mode === 'online') {
    return new OnlineDataStream(taskId, callbacks);
  } else {
    // Offline mode - need frequency/sample rate for mock generator
    return new OfflineDataStream(
      taskId,
      callbacks,
      options?.centerFreq || 915e6,
      options?.sampleRate || 2.4e6,
      options?.fftSize || 2048
    );
  }
}
