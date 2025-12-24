/**
 * API configuration and mode detection
 */

export type ApiMode = "offline" | "online";

/**
 * Get API mode from environment or auto-detect
 */
export function getApiMode(): ApiMode {
  // Check environment variable first
  const envMode = import.meta.env.VITE_API_MODE;
  if (envMode === "offline" || envMode === "online") {
    return envMode;
  }

  // Default to online mode
  // In production, you might want to auto-detect by pinging the backend
  return "online";
}

/**
 * Get API base URL
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || "";
}

/**
 * Get WebSocket base URL
 */
export function getWsBaseUrl(): string {
  const apiUrl = getApiBaseUrl();
  // Convert http(s) to ws(s)
  return apiUrl.replace(/^http/, "ws");
}
