/**
 * Main API client entry point
 */

export { getTaskApi } from './tasks';
export type { TaskApi } from './tasks';

export { createDataStream } from './websocket';
export type { DataStreamStatus, DataStreamCallbacks } from './websocket';

export { getApiMode, getApiBaseUrl, getWsBaseUrl } from './config';
export type { ApiMode } from './config';
