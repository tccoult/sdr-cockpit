/**
 * React hook for managing VisualizationManager lifecycle
 */

import { useEffect, useRef } from "react";
import { VisualizationManager } from "./VisualizationManager";
import type { Theme } from "../app/theme-context";
import type { FrequencyRange } from "../../types/sdr";

interface UseVisualizationManagerOptions {
  theme: Theme;
  colorMap?: Uint8ClampedArray;
  minDb?: number;
  maxDb?: number;
  frequencyRange?: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
  onRenderFpsChange?: (fps: number) => void;
}

export function useVisualizationManager(
  options: UseVisualizationManagerOptions
): VisualizationManager | null {
  const managerRef = useRef<VisualizationManager | null>(null);

  const { minDb, maxDb, frequencyRange, colorMap } = options;

  // Create manager on mount
  useEffect(() => {
    managerRef.current = new VisualizationManager(options);

    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only create once on mount

  // Update manager options when they change
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    if (minDb !== undefined && maxDb !== undefined) {
      manager.setDbRange(minDb, maxDb);
    }
  }, [minDb, maxDb]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !frequencyRange) return;

    manager.setFrequencyRange(frequencyRange);
  }, [frequencyRange]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !colorMap) return;

    manager.setColorMap(colorMap);
  }, [colorMap]);

  return managerRef.current;
}
