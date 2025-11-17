/**
 * WebSocket client for data sources
 * Connects to /ws/sources/{sourceId}/data endpoint
 */

import { sdr_cockpit } from '../proto/spectral_data.js';
import { FFTData, FFTDataBatch } from '../types/sdr';
import { decompressDataTimed } from '../utils/compression';
import { bytesToDbBins, decodeDeltaBatch } from '../utils/spectralConversion';
import { getApiMode, getWsBaseUrl } from './config';

export type DataStreamStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface DataStreamCallbacks {
  onData: (data: FFTDataBatch) => void;
  onStatusChange: (status: DataStreamStatus) => void;
  onError?: (error: string) => void;
}

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
            await this.handleBinaryMessage(event.data);
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
    } catch (err) {
      this.callbacks.onStatusChange('error');
      this.callbacks.onError?.('Failed to create connection');
    }
  }

  private async handleBinaryMessage(arrayBuffer: ArrayBuffer): Promise<void> {
    const bytes = new Uint8Array(arrayBuffer);
    const message = sdr_cockpit.SpectralMessage.decode(bytes);
    let batch: FFTDataBatch;

    // Handle different message types
    if (
      message.type === sdr_cockpit.SpectralMessage.MessageType.SINGLE_FRAME &&
      message.singleFrame
    ) {
      // Single frame
      const frame = message.singleFrame;
      const fftData: FFTData = {
        timestamp: Number(frame.timestamp || 0),
        centerFreq: frame.centerFreq || 0,
        sampleRate: frame.sampleRate || 0,
        bins: bytesToDbBins(frame.bins || new Uint8Array()),
      };
      batch = { frames: [fftData] };
    } else if (
      message.type === sdr_cockpit.SpectralMessage.MessageType.BATCH &&
      message.batch &&
      message.batch.frames
    ) {
      // Uncompressed batch
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
      message.type === sdr_cockpit.SpectralMessage.MessageType.COMPRESSED_BATCH &&
      message.compressedData
    ) {
      // Compressed batch
      const [decompressedBytes] = await decompressDataTimed(message.compressedData);
      const decompressedBatch = sdr_cockpit.FFTFrameBatch.decode(decompressedBytes);

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
    } else {
      return;
    }

    this.callbacks.onData(batch);
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
    const stream = new SourceDataStream(sourceId, callbacks);
    return {
      disconnect: () => stream.disconnect(),
    };
  } else {
    // Offline mode - no streaming for sources
    callbacks.onStatusChange('disconnected');
    return {
      disconnect: () => {},
    };
  }
}
