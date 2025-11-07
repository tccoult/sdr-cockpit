/**
 * WebSocket client with auto-reconnection
 */

import { TARGET_FPS } from "../config/constants";
import { FFTData, FFTDataBatch, VisualizationMode } from "../types/sdr";
import { MockFFTGenerator } from "../utils/mockDataGenerator";
import { getApiMode, getWsBaseUrl } from "./config";

export type DataStreamStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface DataStreamCallbacks {
  onData: (data: FFTDataBatch) => void;
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
    this.callbacks.onStatusChange("connecting");
    const wsUrl = `${getWsBaseUrl()}/ws/tasks/${this.taskId}/data`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onStatusChange("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Check for error messages from server
          if (data.error) {
            this.callbacks.onStatusChange("error");
            this.callbacks.onError?.(data.error);
            return;
          }

          // Convert to batch format
          let batch: FFTDataBatch;

          if (data.frames && Array.isArray(data.frames)) {
            // Already a batch
            batch = {
              frames: data.frames.map((frame: FFTData) => ({
                ...frame,
                bins: Array.isArray(frame.bins)
                  ? new Float32Array(frame.bins)
                  : frame.bins,
              })),
            };
          } else {
            // Single frame - convert to batch
            if (Array.isArray(data.bins)) {
              data.bins = new Float32Array(data.bins);
            }
            batch = { frames: [data as FFTData] };
          }

          this.callbacks.onData(batch);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.callbacks.onStatusChange("error");
      };

      this.ws.onclose = () => {
        this.ws = null;

        // Don't reconnect if manually closed
        if (this.isManualClose) {
          this.callbacks.onStatusChange("disconnected");
          return;
        }

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.callbacks.onStatusChange("connecting");
          this.reconnectAttempts++;
          const delay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            10000
          );

          this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          // Max reconnect attempts reached
          this.callbacks.onStatusChange("error");
          this.callbacks.onError?.(
            "Failed to connect to data stream after multiple attempts"
          );
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.callbacks.onStatusChange("error");
      this.callbacks.onError?.("Failed to create WebSocket connection");
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

    this.callbacks.onStatusChange("disconnected");
  }
}

/**
 * Offline (mock) data stream using MockFFTGenerator
 */
class OfflineDataStream {
  private generator: MockFFTGenerator;
  private intervalId: number | null = null;
  private callbacks: DataStreamCallbacks;
  private isPaused: boolean = false;
  private visualizationMode: VisualizationMode;

  constructor(
    _taskId: string,
    callbacks: DataStreamCallbacks,
    centerFreq: number,
    sampleRate: number,
    fftSize: number = 2048,
    visualizationMode: VisualizationMode = VisualizationMode.FFT_WATERFALL
  ) {
    this.callbacks = callbacks;
    this.visualizationMode = visualizationMode;
    this.generator = new MockFFTGenerator(centerFreq, sampleRate, fftSize);
    this.start();
  }

  private start(): void {
    this.callbacks.onStatusChange("connected");

    if (this.visualizationMode === VisualizationMode.SPECTROGRAM) {
      // For spectrogram mode, send batches of frames periodically
      this.intervalId = window.setInterval(() => {
        if (!this.isPaused) {
          const batchSize = 128; // Generate 128 frames at once
          const frames = [];
          for (let i = 0; i < batchSize; i++) {
            frames.push(this.generator.generateFFT());
          }
          const batch: FFTDataBatch = { frames };
          this.callbacks.onData(batch);
        }
      }, 250); // Send batches every 250 milliseconds
    } else {
      // For fft-only and fft-waterfall modes, send single frames at target FPS
      this.intervalId = window.setInterval(() => {
        if (!this.isPaused) {
          const fftData = this.generator.generateFFT();
          // Convert to batch format
          const batch: FFTDataBatch = { frames: [fftData] };
          this.callbacks.onData(batch);
        }
      }, 1000 / TARGET_FPS);
    }
  }

  disconnect(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callbacks.onStatusChange("disconnected");
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
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
    visualizationMode?: VisualizationMode;
  }
): { disconnect: () => void; pause?: () => void; resume?: () => void } {
  const mode = getApiMode();

  if (mode === "online") {
    return new OnlineDataStream(taskId, callbacks);
  } else {
    // Offline mode - need frequency/sample rate for mock generator
    const stream = new OfflineDataStream(
      taskId,
      callbacks,
      options?.centerFreq || 915e6,
      options?.sampleRate || 2.4e6,
      options?.fftSize || 2048,
      options?.visualizationMode || VisualizationMode.FFT_WATERFALL
    );
    return {
      disconnect: () => stream.disconnect(),
      pause: () => stream.pause(),
      resume: () => stream.resume(),
    };
  }
}
