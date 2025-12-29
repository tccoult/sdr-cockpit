/**
 * WebSocket client for data sources
 * Connects to /ws/sources/{sourceId}/data endpoint
 */

import { sdr_cockpit } from '../proto/spectral_data.js';
import { FFTData } from '../types/sdr';
import { decompressDataTimed } from '../utils/compression';
import { bytesToDbBins, decodeDeltaBatch } from '../utils/spectralConversion';
import { getApiMode, getWsBaseUrl } from './config';
import { DataStreamCallbacks } from './websocket';
import { MockFFTGenerator } from '../mocks/mockDataGenerator';
import { generateMockSources } from '../mocks/mockSourceGenerator';

/**
 * Online (WebSocket) data stream for sources
 */
class SourceDataStream {
  private ws: WebSocket | null = null;
  private sourceId: string;
  private callbacks: DataStreamCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private isManualClose = false;

  constructor(sourceId: string, callbacks: DataStreamCallbacks) {
    this.sourceId = sourceId;
    this.callbacks = callbacks;
    this.connect();
  }

  private connect(): void {
    this.callbacks.onStatusChange('connecting');
    const wsUrl = `${getWsBaseUrl()}/ws/sources/${this.sourceId}/data`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onStatusChange('connected');
      };

      this.ws.onmessage = async (event) => {
        try {
          // Handle JSON control messages
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'ping':
                this.ws?.send(JSON.stringify({ type: 'pong' }));
                break;
              case 'error':
                this.callbacks.onStatusChange('error');
                this.callbacks.onError?.(message.message || 'Unknown error');
                break;
            }
          }
          // Handle binary protobuf data
          else if (event.data instanceof ArrayBuffer) {
            const arrayBuffer = event.data;
            const uint8Array = new Uint8Array(arrayBuffer);

            // Decode protobuf message
            const spectralMessage = sdr_cockpit.SpectralMessage.decode(uint8Array);

            let frames: FFTData[] = [];

            // Handle different message types
            if (spectralMessage.type === sdr_cockpit.SpectralMessage.MessageType.SINGLE_FRAME) {
              // Single frame
              const frame = spectralMessage.singleFrame;
              if (frame && frame.bins) {
                frames = [
                  {
                    timestamp: Number(frame.timestamp || 0),
                    centerFreq: frame.centerFreq || 0,
                    sampleRate: frame.sampleRate || 0,
                    bins: bytesToDbBins(frame.bins),
                  },
                ];
              }
            } else if (spectralMessage.type === sdr_cockpit.SpectralMessage.MessageType.BATCH) {
              // Uncompressed batch
              const batch = spectralMessage.batch;
              if (batch?.frames) {
                // Decode delta-encoded frames if needed
                const deltaFrames = batch.frames
                  .filter((f) => f.bins) // Filter out frames without bins
                  .map((f) => ({
                    bins: f.bins!,
                    isDelta: f.isDelta || false,
                  }));
                const decodedBins = decodeDeltaBatch(deltaFrames);
                frames = batch.frames
                  .filter((f) => f.bins)
                  .map((f, i) => ({
                    timestamp: Number(f.timestamp || 0),
                    centerFreq: f.centerFreq || 0,
                    sampleRate: f.sampleRate || 0,
                    bins: decodedBins[i],
                  }));
              }
            } else if (spectralMessage.type === sdr_cockpit.SpectralMessage.MessageType.COMPRESSED_BATCH) {
              // Compressed batch
              const compressedData = spectralMessage.compressedData;
              if (compressedData) {
                const decompressed = await decompressDataTimed(compressedData);
                const batch = sdr_cockpit.FFTFrameBatch.decode(new Uint8Array(decompressed[0]));

                if (batch?.frames) {
                  const deltaFrames = batch.frames
                    .filter((f) => f.bins)
                    .map((f) => ({
                      bins: f.bins!,
                      isDelta: f.isDelta || false,
                    }));
                  const decodedBins = decodeDeltaBatch(deltaFrames);
                  frames = batch.frames
                    .filter((f) => f.bins)
                    .map((f, i) => ({
                      timestamp: Number(f.timestamp || 0),
                      centerFreq: f.centerFreq || 0,
                      sampleRate: f.sampleRate || 0,
                      bins: decodedBins[i],
                    }));
                }
              }
            }

            // Dispatch frames if we got any
            if (frames.length > 0) {
              this.callbacks.onData({ frames });
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onStatusChange('error');
      };

      this.ws.onclose = () => {
        this.callbacks.onStatusChange('disconnected');

        // Attempt reconnection if not manually closed
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
          }, delay);
        }
      };
    } catch {
      this.callbacks.onStatusChange('error');
      this.callbacks.onError?.('Failed to create connection');
    }
  }

  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Remove event handlers to ensure clean disconnection
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;

      // Close the WebSocket
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.onStatusChange('disconnected');
  }
}

/**
 * Create a data stream from a source
 */
export function createSourceDataStream(
  sourceId: string,
  callbacks: DataStreamCallbacks
): { disconnect: () => void } {
  const apiMode = getApiMode();

  if (apiMode === 'online') {
    const stream = new SourceDataStream(sourceId, callbacks);
    return {
      disconnect: () => stream.disconnect(),
    };
  } else {
    // Offline mode - generate mock FFT data
    const sources = generateMockSources();
    const source = sources.find(s => s.id === sourceId);

    if (!source) {
      callbacks.onStatusChange('error');
      callbacks.onError?.(`Source not found: ${sourceId}`);
      return { disconnect: () => {} };
    }

    // Create mock FFT generator with source parameters
    const generator = new MockFFTGenerator(
      source.centerFrequency,
      source.sampleRate,
      2048 // Default FFT size
    );

    callbacks.onStatusChange('connected');

    // Generate FFT data at ~60 FPS
    const intervalId = window.setInterval(() => {
      const frame = generator.generateFFT();
      callbacks.onData({ frames: [frame] });
    }, 16);

    return {
      disconnect: () => {
        window.clearInterval(intervalId);
        callbacks.onStatusChange('disconnected');
      },
    };
  }
}
