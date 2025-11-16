/**
 * WebSocket client with auto-reconnection and protobuf binary data support
 */

import { VisualizationMode } from "../api/client";
import { TARGET_FPS } from "../config/constants";
import { MockFFTGenerator } from "../mocks/mockDataGenerator";
import { sdr_cockpit } from "../proto/spectral_data.js";
import { FFTData, FFTDataBatch } from "../types/sdr";
import { decompressDataTimed } from "../utils/compression";
import { bytesToDbBins, decodeDeltaBatch } from "../utils/spectralConversion";
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
 * Online (WebSocket) data stream with heartbeat support and protobuf binary data
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
      this.ws.binaryType = "arraybuffer"; // Required for binary protobuf messages

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        // Wait for connected message before marking as connected
      };

      this.ws.onmessage = async (event) => {
        try {
          // Handle JSON control messages (connected, ping, error, etc.)
          if (typeof event.data === "string") {
            const message = JSON.parse(event.data);

            // Handle different message types
            switch (message.type) {
              case "connected":
                // Server sent client ID and connection confirmation
                this.callbacks.onStatusChange("connected");
                break;

              case "ping":
                // Respond to heartbeat ping
                this.ws?.send(
                  JSON.stringify({ type: "pong", timestamp: message.timestamp })
                );
                break;

              case "error":
                // Server error message
                this.callbacks.onStatusChange("error");
                this.callbacks.onError?.(message.message || "Unknown error");
                break;

              case "health_update":
                // Health/BIT update broadcast (for future use)
                // Could trigger UI updates or notifications
                console.log("Health update:", message.data);
                break;

              case "system_update_lock_changed":
                // System update lock status changed (for future use)
                // Could trigger UI updates in SystemUpdateWizard
                console.log("Lock status changed:", message.data);
                break;

              default:
                console.warn("Unknown JSON message type:", message.type);
            }
          }

          // Handle binary protobuf data messages
          if (event.data instanceof ArrayBuffer) {
            await this.handleBinaryDataMessage(event.data);
          }
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

  private async handleBinaryDataMessage(
    arrayBuffer: ArrayBuffer
  ): Promise<void> {
    try {
      const bytes = new Uint8Array(arrayBuffer);
      const message = sdr_cockpit.SpectralMessage.decode(bytes);
      let batch: FFTDataBatch;

      // Process based on message type
      if (
        message.type === sdr_cockpit.SpectralMessage.MessageType.BATCH &&
        message.batch &&
        message.batch.frames
      ) {
        // Uncompressed batch of frames (spectrogram mode, delta-encoded)
        const decodedBins = decodeDeltaBatch(
          message.batch.frames.map((f) => ({
            bins: f.bins || new Uint8Array(),
            isDelta: f.isDelta || false,
          }))
        );

        const frames: FFTData[] = message.batch.frames.map((frame, idx) => ({
          timestamp: Number(frame.timestamp || 0),
          centerFreq: frame.centerFreq || 0,
          sampleRate: frame.sampleRate || 0,
          bins: decodedBins[idx],
        }));
        batch = { frames };
      } else if (
        message.type ===
          sdr_cockpit.SpectralMessage.MessageType.COMPRESSED_BATCH &&
        message.compressedData
      ) {
        // Compressed batch - decompress first, then decode deltas
        const [decompressedBytes, _decompressTimeMs] = await decompressDataTimed(
          message.compressedData
        );
        const decompressedBatch =
          sdr_cockpit.FFTFrameBatch.decode(decompressedBytes);

        const decodedBins = decodeDeltaBatch(
          decompressedBatch.frames.map((f) => ({
            bins: f.bins || new Uint8Array(),
            isDelta: f.isDelta || false,
          }))
        );

        const frames: FFTData[] = decompressedBatch.frames.map((frame, idx) => ({
          timestamp: Number(frame.timestamp || 0),
          centerFreq: frame.centerFreq || 0,
          sampleRate: frame.sampleRate || 0,
          bins: decodedBins[idx],
        }));
        batch = { frames };
      } else if (
        message.type === sdr_cockpit.SpectralMessage.MessageType.SINGLE_FRAME &&
        message.singleFrame
      ) {
        // Single frame (FFT_ONLY / FFT_WATERFALL mode)
        const frame = message.singleFrame;
        const fftData: FFTData = {
          timestamp: Number(frame.timestamp || 0),
          centerFreq: frame.centerFreq || 0,
          sampleRate: frame.sampleRate || 0,
          bins: bytesToDbBins(frame.bins || new Uint8Array()),
        };
        batch = { frames: [fftData] };
      } else {
        console.error(
          "[WebSocket] Unknown protobuf message type:",
          message.type
        );
        return;
      }

      this.callbacks.onData(batch);
    } catch (error) {
      console.error("[WebSocket] Error handling binary message:", error);
      throw error;
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
