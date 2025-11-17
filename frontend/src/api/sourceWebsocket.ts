/**
 * WebSocket client for data sources
 * Connects to /ws/sources/{sourceId}/data endpoint
 */

import { sdr_cockpit } from '../proto/spectral_data.js';
import { FFTData, FFTDataBatch } from '../types/sdr';
import { decompressDataTimed } from '../utils/compression';
import { bytesToDbBins, decodeDeltaBatch } from '../utils/spectralConversion';
import { getApiMode, getWsBaseUrl } from './config';
import { DataStreamStatus, DataStreamCallbacks } from './websocket';

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
      this.ws.binaryType = 'arraybuffer'; // Required for binary protobuf messages

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onStatusChange('connected');
      };

      this.ws.onmessage = async (event) => {
        try {
          // Handle JSON control messages (error, ping, etc.)
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'ping':
                // Respond to heartbeat ping
                this.ws?.send(JSON.stringify({ type: 'pong' }));
                break;

              case 'error':
                // Server error message
                this.callbacks.onStatusChange('error');
                this.callbacks.onError?.(message.message || 'Unknown error');
                break;

              default:
                console.warn('Unknown JSON message type:', message.type);
            }
          }

          // Handle binary protobuf data messages
          else if (event.data instanceof ArrayBuffer) {
            const arrayBuffer = event.data;
            const uint8Array = new Uint8Array(arrayBuffer);

            // Decode protobuf message
            const spectralMessage = sdr_cockpit.SpectralMessage.decode(uint8Array);

            let frames: FFTData[] = [];

            // Handle different message types
            if (spectralMessage.type === sdr_cockpit.SpectralMessage.Type.SINGLE_FRAME) {
              // Single frame
              const frame = spectralMessage.singleFrame;
              if (frame) {
                frames = [
                  {
                    timestamp: frame.timestamp,
                    centerFreq: frame.centerFreq,
                    sampleRate: frame.sampleRate,
                    bins: bytesToDbBins(frame.bins),
                  },
                ];
              }
            } else if (spectralMessage.type === sdr_cockpit.SpectralMessage.Type.BATCH) {
              // Uncompressed batch
              const batch = spectralMessage.batch;
              if (batch?.frames) {
                // Decode delta-encoded frames if needed
                frames = decodeDeltaBatch(
                  batch.frames.map((f) => ({
                    timestamp: f.timestamp,
                    centerFreq: f.centerFreq,
                    sampleRate: f.sampleRate,
                    bins: f.bins,
                    isDelta: f.isDelta,
                  }))
                );
              }
            } else if (spectralMessage.type === sdr_cockpit.SpectralMessage.Type.COMPRESSED_BATCH) {
              // Compressed batch
              const compressedData = spectralMessage.compressedData;
              if (compressedData) {
                const { decompressedData } = await decompressDataTimed(compressedData);
                const batch = sdr_cockpit.FFTFrameBatch.decode(new Uint8Array(decompressedData));

                if (batch?.frames) {
                  frames = decodeDeltaBatch(
                    batch.frames.map((f) => ({
                      timestamp: f.timestamp,
                      centerFreq: f.centerFreq,
                      sampleRate: f.sampleRate,
                      bins: f.bins,
                      isDelta: f.isDelta,
                    }))
                  );
                }
              }
            }

            // Dispatch frames if we got any
            if (frames.length > 0) {
              this.callbacks.onData({ frames });
            }
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
          this.callbacks.onError?.('Failed to process message');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onStatusChange('error');
        this.callbacks.onError?.('WebSocket connection error');
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
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
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
    // Real WebSocket connection
    const stream = new SourceDataStream(sourceId, callbacks);
    return {
      disconnect: () => stream.disconnect(),
    };
  } else {
    // Offline mode - no mock needed for sources yet
    // In offline mode, sources don't exist, so just return a no-op
    callbacks.onStatusChange('disconnected');
    return {
      disconnect: () => {},
    };
  }
}
