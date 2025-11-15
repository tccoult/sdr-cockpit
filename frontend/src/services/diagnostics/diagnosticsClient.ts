import { getApiBaseUrl, getApiMode } from "../../api";
import type { BistResult, SystemInfo } from "../../types/diagnostics";
import { getMockBistResult, getMockSystemInfo } from "../../utils/mockDiagnostics";

type DiagnosticsSource = "api" | "mock";

export interface DiagnosticsSnapshot {
  bistResult: BistResult;
  systemInfo: SystemInfo;
  fetchedAt: number;
  source: DiagnosticsSource;
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildMockSnapshot(): DiagnosticsSnapshot {
  return {
    bistResult: getMockBistResult(),
    systemInfo: getMockSystemInfo(),
    fetchedAt: Date.now(),
    source: "mock",
  };
}

export async function fetchDiagnosticsSnapshot(
  signal?: AbortSignal
): Promise<DiagnosticsSnapshot> {
  const mode = getApiMode();

  if (mode === "online") {
    const baseUrl = getApiBaseUrl();
    try {
      const [bistResult, systemInfo] = await Promise.all([
        fetchJson<BistResult>(`${baseUrl}/api/diagnostics/bist`, signal),
        fetchJson<SystemInfo>(`${baseUrl}/api/system/info`, signal),
      ]);

      return {
        bistResult,
        systemInfo,
        fetchedAt: Date.now(),
        source: "api",
      };
    } catch (error) {
      console.warn("Falling back to mock diagnostics data", error);
    }
  }

  return buildMockSnapshot();
}
