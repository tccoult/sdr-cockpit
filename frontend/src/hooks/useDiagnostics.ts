import { useCallback, useEffect, useRef, useState } from "react";

import { fetchDiagnosticsSnapshot } from "../services/diagnostics";
import type { DiagnosticsSnapshot } from "../services/diagnostics";

export interface DiagnosticsState {
  snapshot: DiagnosticsSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLL_INTERVAL_MS = 30_000;

export function useDiagnostics(pollIntervalMs = DEFAULT_POLL_INTERVAL_MS): DiagnosticsState {
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const nextSnapshot = await fetchDiagnosticsSnapshot();
      setSnapshot(nextSnapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load diagnostics";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (pollIntervalMs <= 0) {
      return;
    }

    pollIntervalRef.current = window.setInterval(() => {
      loadSnapshot().catch(() => {
        // errors handled by hook state
      });
    }, pollIntervalMs);

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [loadSnapshot, pollIntervalMs]);

  const refresh = useCallback(async () => {
    await loadSnapshot();
  }, [loadSnapshot]);

  return {
    snapshot,
    isLoading,
    error,
    refresh,
  };
}
