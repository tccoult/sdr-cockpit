/**
 * VisualizationManager - Manages plot instances and data routing for different visualization modes
 */

import {
  createPlot,
  PlotHandle,
  LineLayerHandle,
  HeatmapLayerHandle,
  PlotCreationOptions,
  AxisRange,
} from "../../plot";
import { FFTData, FFTDataBatch, FrequencyRange, VisualizationMode } from "../../types/sdr";
import type { Theme } from "../app/theme-context";

const SMOOTHING_FACTOR = 0.95;
const MAX_POINTS = 2048;
const MIN_WATERFALL_ROWS = 64;
const MAX_WATERFALL_ROWS = 2048;

interface PlotConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

interface VisualizationManagerOptions {
  theme: Theme;
  colorMap?: Uint8ClampedArray;
  minDb?: number;
  maxDb?: number;
  frequencyRange?: FrequencyRange;
  onFrequencyRangeChange?: (range: FrequencyRange) => void;
}

export class VisualizationManager {
  private mode: VisualizationMode = "fft-waterfall";
  private plots = new Map<string, PlotHandle>();
  private layers = new Map<string, LineLayerHandle | HeatmapLayerHandle>();

  // State
  private options: VisualizationManagerOptions;
  private frequencyRange: FrequencyRange = { startFreq: 0, endFreq: 1e6 };
  private minDb = -100;
  private maxDb = -20;

  // FFT smoothing buffer
  private smoothingBuffer: Float32Array | null = null;

  // Waterfall state
  private waterfallRowCount = 0;

  constructor(options: VisualizationManagerOptions) {
    this.options = options;
    if (options.frequencyRange) {
      this.frequencyRange = options.frequencyRange;
    }
    if (options.minDb !== undefined) {
      this.minDb = options.minDb;
    }
    if (options.maxDb !== undefined) {
      this.maxDb = options.maxDb;
    }
  }

  /**
   * Set the visualization mode and reconfigure plots accordingly
   */
  setMode(
    mode: VisualizationMode,
    configs: {
      fft?: PlotConfig;
      waterfall?: PlotConfig;
      spectrogram?: PlotConfig;
    }
  ): void {
    // Clean up existing plots
    this.destroyAllPlots();

    this.mode = mode;

    // Create plots based on mode
    switch (mode) {
      case "fft-only":
        if (configs.fft) {
          this.createFFTPlot(configs.fft);
        }
        break;

      case "fft-waterfall":
        if (configs.fft) {
          this.createFFTPlot(configs.fft);
        }
        if (configs.waterfall) {
          this.createWaterfallPlot(configs.waterfall);
        }
        break;

      case "spectrogram":
        if (configs.spectrogram) {
          this.createSpectrogramPlot(configs.spectrogram);
        }
        break;
    }
  }

  /**
   * Handle incoming data batch
   */
  handleDataBatch(batch: FFTDataBatch): void {
    if (!batch.frames || batch.frames.length === 0) {
      return;
    }

    switch (this.mode) {
      case "fft-only":
        // Show only the latest frame
        this.updateFFT(batch.frames[batch.frames.length - 1]);
        break;

      case "fft-waterfall":
        // Update FFT with latest frame
        this.updateFFT(batch.frames[batch.frames.length - 1]);
        // Push all frames to waterfall
        for (const frame of batch.frames) {
          this.updateWaterfall(frame);
        }
        break;

      case "spectrogram":
        // Render entire batch as a static spectrogram
        this.updateSpectrogram(batch.frames);
        break;
    }
  }

  /**
   * Set frequency range and sync across all plots
   */
  setFrequencyRange(range: FrequencyRange): void {
    this.frequencyRange = range;
    const axisRange: AxisRange = { min: range.startFreq, max: range.endFreq };

    for (const plot of this.plots.values()) {
      plot.setXRange(axisRange);
    }
  }

  /**
   * Set dB range and sync across all plots
   */
  setDbRange(minDb: number, maxDb: number): void {
    this.minDb = minDb;
    this.maxDb = maxDb;

    // Update FFT Y-axis
    const fftPlot = this.plots.get("fft");
    if (fftPlot) {
      fftPlot.setYRange({ min: minDb, max: maxDb });
    }

    // Update heatmap clips
    const waterfallLayer = this.layers.get("waterfall") as HeatmapLayerHandle | undefined;
    if (waterfallLayer) {
      waterfallLayer.setClip({ min: minDb, max: maxDb });
    }

    const spectrogramLayer = this.layers.get("spectrogram") as HeatmapLayerHandle | undefined;
    if (spectrogramLayer) {
      spectrogramLayer.setClip({ min: minDb, max: maxDb });
    }
  }

  /**
   * Update color map for heatmap layers
   */
  setColorMap(colorMap: Uint8ClampedArray): void {
    this.options.colorMap = colorMap;
    // Would need to recreate heatmap layers to change colormap
    // For now, this is a limitation - colormap changes require mode reset
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.destroyAllPlots();
  }

  // Private methods

  private createFFTPlot(config: PlotConfig): void {
    const isDark = this.options.theme === "dark";
    const plotColors = this.getFFTColors(isDark);

    const plotOptions: PlotCreationOptions = {
      background: plotColors.background,
      theme: {
        gridColor: plotColors.gridColor,
        textColor: plotColors.textColor,
        axisColor: plotColors.axisColor,
        cursorLineColor: plotColors.textColor,
        cursorHighlightColor: plotColors.traceColor,
      },
      interactions: {
        pan: { x: true, y: false },
        zoom: { x: true, y: false, factor: 0.2 },
        cursor: { enabled: true, style: "crosshair" },
        boxZoom: { mode: "x", modifier: "shift" },
      },
      axes: {
        x: {
          label: "Frequency (Hz)",
          ticksTarget: 8,
        },
        y: {
          label: "Power (dB)",
          formatter: (value: number) => `${value.toFixed(1)}`,
          ticksTarget: 4,
        },
      },
      xRange: { min: this.frequencyRange.startFreq, max: this.frequencyRange.endFreq },
      yRange: { min: this.minDb, max: this.maxDb },
    };

    const plot = createPlot(config.canvas, plotOptions);
    this.plots.set("fft", plot);

    const lineLayer = plot.addLine({
      color: plotColors.traceColor,
      lineWidth: 2,
    });
    this.layers.set("fft-line", lineLayer);

    // Subscribe to interactions
    plot.onZoom((axis, range) => {
      if (axis === "x" && this.options.onFrequencyRangeChange) {
        this.options.onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
      }
    });

    plot.onPan((axis, range) => {
      if (axis === "x" && this.options.onFrequencyRangeChange) {
        this.options.onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
      }
    });
  }

  private createWaterfallPlot(config: PlotConfig): void {
    const isDark = this.options.theme === "dark";
    const plotColors = this.getWaterfallColors(isDark);

    this.waterfallRowCount = Math.max(
      MIN_WATERFALL_ROWS,
      Math.min(MAX_WATERFALL_ROWS, Math.floor(config.height))
    );

    const plotOptions: PlotCreationOptions = {
      background: plotColors.background,
      theme: {
        background: plotColors.background,
        axisColor: plotColors.axisColor,
        textColor: plotColors.textColor,
        gridColor: plotColors.gridColor,
        cursorLineColor: plotColors.textColor,
        cursorHighlightColor: plotColors.textColor,
      },
      interactions: {
        pan: { x: true, y: false },
        zoom: { x: true, y: true, factor: 0.2 },
        cursor: { enabled: true, style: "none" },
        boxZoom: { mode: "xy", modifier: "shift" },
      },
      axes: {
        x: {
          label: "Frequency (Hz)",
          ticksTarget: 8,
        },
        y: {
          label: "Time",
          formatter: () => "",
          ticksTarget: 4,
        },
      },
      xRange: { min: this.frequencyRange.startFreq, max: this.frequencyRange.endFreq },
      yRange: { min: 0, max: this.waterfallRowCount },
    };

    const plot = createPlot(config.canvas, plotOptions);
    this.plots.set("waterfall", plot);

    // Subscribe to interactions
    plot.onZoom((axis, range) => {
      if (axis === "x" && this.options.onFrequencyRangeChange) {
        this.options.onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
      }
    });

    plot.onPan((axis, range) => {
      if (axis === "x" && this.options.onFrequencyRangeChange) {
        this.options.onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
      }
    });
  }

  private createSpectrogramPlot(config: PlotConfig): void {
    const isDark = this.options.theme === "dark";
    const plotColors = this.getWaterfallColors(isDark);

    const plotOptions: PlotCreationOptions = {
      background: plotColors.background,
      theme: {
        background: plotColors.background,
        axisColor: plotColors.axisColor,
        textColor: plotColors.textColor,
        gridColor: plotColors.gridColor,
        cursorLineColor: plotColors.textColor,
        cursorHighlightColor: plotColors.textColor,
      },
      interactions: {
        pan: { x: true, y: true },
        zoom: { x: true, y: true, factor: 0.2 },
        cursor: { enabled: true, style: "crosshair" },
        boxZoom: { mode: "xy", modifier: "shift" },
      },
      axes: {
        x: {
          label: "Frequency (Hz)",
          ticksTarget: 8,
        },
        y: {
          label: "Time",
          ticksTarget: 6,
        },
      },
      xRange: { min: this.frequencyRange.startFreq, max: this.frequencyRange.endFreq },
      yRange: { min: 0, max: 100 }, // Will be updated based on data
    };

    const plot = createPlot(config.canvas, plotOptions);
    this.plots.set("spectrogram", plot);

    // Subscribe to interactions
    plot.onZoom((axis, range) => {
      if (axis === "x" && this.options.onFrequencyRangeChange) {
        this.options.onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
      }
    });

    plot.onPan((axis, range) => {
      if (axis === "x" && this.options.onFrequencyRangeChange) {
        this.options.onFrequencyRangeChange({ startFreq: range.min, endFreq: range.max });
      }
    });
  }

  private updateFFT(frame: FFTData): void {
    const lineLayer = this.layers.get("fft-line") as LineLayerHandle | undefined;
    if (!lineLayer) return;

    const bins = frame.bins;
    if (!bins || bins.length === 0) return;

    // Apply smoothing
    let smoothed = this.smoothingBuffer;
    if (!smoothed || smoothed.length !== bins.length) {
      smoothed = new Float32Array(bins);
    } else {
      for (let i = 0; i < bins.length; i++) {
        smoothed[i] = smoothed[i] * SMOOTHING_FACTOR + bins[i] * (1 - SMOOTHING_FACTOR);
      }
    }
    this.smoothingBuffer = smoothed;

    // Calculate frequency bins
    const sampleRate = frame.sampleRate;
    const centerFreq = frame.centerFreq;
    const binCount = smoothed.length;
    const binWidth = sampleRate / binCount;
    const fftStart = centerFreq - sampleRate / 2;

    // Determine visible range
    const { startFreq, endFreq } = this.frequencyRange;
    let startBin = Math.floor((startFreq - fftStart) / binWidth);
    let endBin = Math.ceil((endFreq - fftStart) / binWidth);
    startBin = Math.max(0, Math.min(binCount - 1, startBin));
    endBin = Math.max(startBin + 1, Math.min(binCount, endBin));

    const rangeBinCount = endBin - startBin;
    const maxPoints = Math.min(MAX_POINTS, Math.max(1, rangeBinCount));
    const freqs = new Float32Array(maxPoints);
    const powers = new Float32Array(maxPoints);
    const step = maxPoints > 1 ? (rangeBinCount - 1) / (maxPoints - 1) : 0;

    for (let i = 0; i < maxPoints; i++) {
      const offset = maxPoints > 1 ? Math.round(i * step) : 0;
      const binIndex = Math.min(rangeBinCount - 1, offset) + startBin;
      const freq = fftStart + binIndex * binWidth;
      const power = smoothed[binIndex];

      if (!Number.isFinite(power)) {
        freqs[i] = Number.NaN;
        powers[i] = Number.NaN;
        continue;
      }

      freqs[i] = freq;
      powers[i] = power;
    }

    lineLayer.setXY(freqs, powers);
    this.plots.get("fft")?.requestDraw();
  }

  private updateWaterfall(frame: FFTData): void {
    const plot = this.plots.get("waterfall");
    if (!plot) return;

    // Lazy create heatmap layer when first data arrives
    let heatmapLayer = this.layers.get("waterfall") as HeatmapLayerHandle | undefined;
    if (!heatmapLayer && frame.bins.length > 0) {
      heatmapLayer = plot.addHeatmap({
        width: frame.bins.length,
        height: this.waterfallRowCount,
        colormap: this.options.colorMap,
        clip: { min: this.minDb, max: this.maxDb },
        domain: {
          x: { min: frame.centerFreq - frame.sampleRate / 2, max: frame.centerFreq + frame.sampleRate / 2 },
          y: { min: 0, max: this.waterfallRowCount },
        },
      });
      this.layers.set("waterfall", heatmapLayer);
    }

    if (heatmapLayer && frame.bins.length > 0) {
      heatmapLayer.pushRow(frame.bins);
      heatmapLayer.setDomain({
        x: { min: frame.centerFreq - frame.sampleRate / 2, max: frame.centerFreq + frame.sampleRate / 2 },
        y: { min: 0, max: this.waterfallRowCount },
      });
      plot.requestDraw();
    }
  }

  private updateSpectrogram(frames: FFTData[]): void {
    const plot = this.plots.get("spectrogram");
    if (!plot || frames.length === 0) return;

    const firstFrame = frames[0];
    const binCount = firstFrame.bins.length;
    const frameCount = frames.length;

    // Remove old layer if it exists
    const oldLayer = this.layers.get("spectrogram");
    if (oldLayer) {
      oldLayer.remove();
      this.layers.delete("spectrogram");
    }

    // Create new heatmap layer with full spectrogram data
    const heatmapLayer = plot.addHeatmap({
      width: binCount,
      height: frameCount,
      colormap: this.options.colorMap,
      clip: { min: this.minDb, max: this.maxDb },
      domain: {
        x: {
          min: firstFrame.centerFreq - firstFrame.sampleRate / 2,
          max: firstFrame.centerFreq + firstFrame.sampleRate / 2
        },
        y: { min: 0, max: frameCount },
      },
    });

    this.layers.set("spectrogram", heatmapLayer);

    // Convert frames to 2D array
    const data: number[][] = [];
    for (let i = 0; i < frameCount; i++) {
      data.push(Array.from(frames[i].bins));
    }

    heatmapLayer.setFullImage(data);
    plot.setYRange({ min: 0, max: frameCount });
    plot.requestDraw();
  }

  private destroyAllPlots(): void {
    // Clean up layers
    for (const layer of this.layers.values()) {
      layer.remove();
    }
    this.layers.clear();

    // Clean up plots
    for (const plot of this.plots.values()) {
      plot.destroy();
    }
    this.plots.clear();

    // Reset state
    this.smoothingBuffer = null;
    this.waterfallRowCount = 0;
  }

  private getFFTColors(isDark: boolean) {
    if (isDark) {
      return {
        background: "rgba(10, 10, 15, 0.85)",
        gridColor: "rgba(255, 255, 255, 0.12)",
        textColor: "#ffffff",
        axisColor: "rgba(255, 255, 255, 0.4)",
        traceColor: "#FF00FF",
      };
    }
    return {
      background: "rgba(245, 245, 250, 0.95)",
      gridColor: "rgba(0, 0, 0, 0.08)",
      textColor: "#1e293b",
      axisColor: "rgba(51, 65, 85, 0.8)",
      traceColor: "#8b5cf6",
    };
  }

  private getWaterfallColors(isDark: boolean) {
    if (isDark) {
      return {
        background: "rgba(10, 10, 15, 0.95)",
        axisColor: "rgba(255, 255, 255, 0.4)",
        textColor: "rgba(255, 255, 255, 0.85)",
        gridColor: "rgba(255, 255, 255, 0.08)",
      };
    }
    return {
      background: "rgba(245, 245, 250, 0.95)",
      axisColor: "rgba(51, 65, 85, 0.6)",
      textColor: "#1e293b",
      gridColor: "rgba(15, 23, 42, 0.08)",
    };
  }
}
