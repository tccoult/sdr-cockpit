/**
 * Shared types for WebSocket data streams
 */

import { FFTDataBatch } from "../types/sdr";

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
