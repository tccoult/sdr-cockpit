/**
 * Custom hook for data streaming from a data source
 * Handles WebSocket connections, reconnection, and FPS tracking
 *
 * This is the source-based version of useDataStream that connects to
 * /ws/sources/{sourceId}/data instead of /ws/tasks/{taskId}/data
 */

import { useState, useEffect, useRef } from 'react';
import { FFTDataBatch } from '../types/sdr';
import { DataStreamStatus } from '../api/websocket';
import { createSourceDataStream } from '../api/sourceWebsocket';
import { dispatchFFTData } from '../mocks/mockDataGenerator';

export interface UseSourceStreamOptions {
  sourceId: string | null;
  enabled?: boolean; // Whether to enable streaming (e.g., disabled when wizard is open)
}

export interface UseSourceStreamResult {
  fps: number;
  streamStatus: DataStreamStatus;
  streamError: string | null;
}

export function useSourceStream(options: UseSourceStreamOptions): UseSourceStreamResult {
  const { sourceId, enabled = true } = options;

  const [fps, setFps] = useState(0);
  const [streamStatus, setStreamStatus] = useState<DataStreamStatus>('disconnected');
  const [streamError, setStreamError] = useState<string | null>(null);

  const dataStreamRef = useRef<{ disconnect: () => void } | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  useEffect(() => {
    // Clean up previous stream
    if (dataStreamRef.current) {
      dataStreamRef.current.disconnect();
      dataStreamRef.current = null;
    }

    // No source selected or streaming disabled
    if (!sourceId || !enabled) {
      setStreamStatus('disconnected');
      setStreamError(null);
      setFps(0);
      frameCountRef.current = 0;
      return;
    }

    // Create new data stream
    setStreamError(null);
    const stream = createSourceDataStream(sourceId, {
      onData: (batch: FFTDataBatch) => {
        // Dispatch FFT data batch through custom event system
        dispatchFFTData(batch.frames);

        // Update FPS counter (count frames in batch)
        frameCountRef.current += batch.frames.length;
        const now = Date.now();
        if (now - lastFpsUpdateRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }
      },
      onStatusChange: (status: DataStreamStatus) => {
        setStreamStatus(status);
      },
      onError: (error: string) => {
        setStreamError(error);
      },
    });

    dataStreamRef.current = stream;

    return () => {
      stream.disconnect();
      setFps(0);
      frameCountRef.current = 0;
    };
  }, [sourceId, enabled]);

  return {
    fps,
    streamStatus,
    streamError,
  };
}
