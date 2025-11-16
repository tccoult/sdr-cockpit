/**
 * Type-safe API client using openapi-fetch
 *
 * This client is automatically typed based on the OpenAPI schema.
 * Run `npm run generate:types` to update types after backend changes.
 */

import createClient from 'openapi-fetch';
import type { paths } from '../types/generated/api';
import { getApiBaseUrl } from './config';

/**
 * Create a type-safe API client instance
 */
export const apiClient = createClient<paths>({
  baseUrl: getApiBaseUrl(),
});

/**
 * Re-export types for convenience
 */
export type { paths } from '../types/generated/api';
export type { components } from '../types/generated/api';

/**
 * Re-export commonly used API types
 */
import type { components } from '../types/generated/api';

export type Task = components['schemas']['Task'];
export type CreateRxTaskParams = components['schemas']['CreateRxTaskParams'];
export type CreateTxTaskParams = components['schemas']['CreateTxTaskParams'];
export type UpdateTaskParams = components['schemas']['UpdateTaskParams'];
export type RecordingInfo = components['schemas']['RecordingInfo'];
export type PlaybackInfo = components['schemas']['PlaybackInfo'];

/**
 * Enum types (exported as both type and const for runtime usage)
 */
export type TaskType = components['schemas']['TaskType'];
export const TaskType = {
  RX: 'rx' as const,
  TX: 'tx' as const,
};

export type TaskStatus = components['schemas']['TaskStatus'];
export const TaskStatus = {
  LIVE: 'live' as const,
  PAUSED: 'paused' as const,
  TRANSMITTING: 'transmitting' as const,
  STOPPED: 'stopped' as const,
};

export type TaskOwner = components['schemas']['TaskOwner'];
export const TaskOwner = {
  SELF: 'self' as const,
  EXTERNAL: 'external' as const,
};

export type VisualizationMode = components['schemas']['VisualizationMode'];
export const VisualizationMode = {
  FFT_ONLY: 'fft-only' as const,
  FFT_WATERFALL: 'fft-waterfall' as const,
  SPECTROGRAM: 'spectrogram' as const,
};
