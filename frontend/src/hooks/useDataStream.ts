/**
 * Custom hook for FFT data streaming
 * Handles WebSocket connections, reconnection, and FPS tracking
 */

import { useState, useEffect, useRef } from 'react';
import { FFTDataBatch } from '../types/sdr';
import { createDataStream, DataStreamStatus } from '../api';
import { dispatchFFTData } from '../utils/mockDataGenerator';

export interface UseDataStreamOptions {
  taskId: string | null;
  centerFreq?: number;
  sampleRate?: number;
  fftSize?: number;
  enabled?: boolean; // Whether to enable streaming (e.g., disabled when wizard is open)
  paused?: boolean; // Whether the task is paused
}

export interface UseDataStreamResult {
  fps: number;
  streamStatus: DataStreamStatus;
  streamError: string | null;
}

export function useDataStream(options: UseDataStreamOptions): UseDataStreamResult {
  const { taskId, centerFreq, sampleRate, fftSize, enabled = true, paused = false } = options;

  const [fps, setFps] = useState(0);
  const [streamStatus, setStreamStatus] = useState<DataStreamStatus>('disconnected');
  const [streamError, setStreamError] = useState<string | null>(null);

  const dataStreamRef = useRef<{ disconnect: () => void; pause?: () => void; resume?: () => void } | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  useEffect(() => {
    // Clean up previous stream
    if (dataStreamRef.current) {
      dataStreamRef.current.disconnect();
      dataStreamRef.current = null;
    }

    // No task selected or streaming disabled
    if (!taskId || !enabled) {
      setStreamStatus('disconnected');
      setStreamError(null);
      setFps(0);
      frameCountRef.current = 0;
      return;
    }

    // Need frequency/sample rate for stream
    if (!centerFreq || !sampleRate) {
      return;
    }

    // Create new data stream
    setStreamError(null);
    const stream = createDataStream(
      taskId,
      {
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
      },
      {
        centerFreq,
        sampleRate,
        fftSize: fftSize || 2048,
      }
    );

    dataStreamRef.current = stream;

    return () => {
      stream.disconnect();
      setFps(0);
      frameCountRef.current = 0;
    };
  }, [taskId, centerFreq, sampleRate, fftSize, enabled]);

  // Handle pause/resume
  useEffect(() => {
    const stream = dataStreamRef.current;
    if (!stream) return;

    if (paused) {
      stream.pause?.();
      setFps(0);
      frameCountRef.current = 0;
    } else {
      stream.resume?.();
    }
  }, [paused]);

  return {
    fps,
    streamStatus,
    streamError,
  };
}
