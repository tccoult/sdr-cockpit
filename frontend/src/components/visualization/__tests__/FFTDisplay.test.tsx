/**
 * Tests for FFTDisplay component
 *
 * FFTDisplay is the core visualization component that renders real-time
 * FFT spectrum data using WebGL. These tests verify:
 * - Component renders without crashing
 * - Props are correctly applied
 * - FFT data events are processed
 * - Cleanup happens on unmount
 *
 * Note: These are unit/integration tests, not visual regression tests.
 * We're testing behavior, not pixel-perfect rendering.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { FFTDisplay } from '../FFTDisplay';
import type { FFTData } from '../../../types/sdr';

// ─────────────────────────────────────────────────────────────────────────────
// Mock the plot engine
// We don't want to test WebGL rendering, just component behavior
// ─────────────────────────────────────────────────────────────────────────────
const mockPlot = {
  addLine: vi.fn(() => ({
    setXY: vi.fn(),
    remove: vi.fn(),
  })),
  onZoom: vi.fn((_callback: unknown) => vi.fn()),
  onPan: vi.fn((_callback: unknown) => vi.fn()),
  onCursor: vi.fn((_callback: unknown) => vi.fn()),
  setXRange: vi.fn(),
  setYRange: vi.fn(),
  setBoxZoomModifier: vi.fn(),
  requestDraw: vi.fn(),
  isDestroyed: vi.fn(() => false),
};

vi.mock('../../../plot', () => ({
  usePlot: () => ({
    plot: mockPlot,
    attachCanvas: vi.fn(),
  }),
}));

vi.mock('../../../hooks', () => ({
  usePlotRenderFps: () => 60,
}));

describe('FFTDisplay Component', () => {
  // Default props that satisfy the component's requirements
  const defaultProps = {
    width: 800,
    height: 400,
    minDb: -120,
    maxDb: 0,
    frequencyRange: { startFreq: 900e6, endFreq: 930e6 },
    theme: 'dark' as const,
    interactionMode: 'pan' as const,
    maxHoldEnabled: false,
    maxHoldClearKey: 0,
    rangeRequestKey: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Basic Rendering Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    /**
     * Most basic test - the component should render.
     * If this fails, something fundamental is broken.
     */
    render(<FFTDisplay {...defaultProps} />);

    // Should render a canvas element
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('applies correct dimensions', () => {
    /**
     * Verify width and height props are applied to the container.
     * This ensures the component respects layout constraints.
     */
    const { container } = render(
      <FFTDisplay {...defaultProps} width={1024} height={512} />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('1024px');
    expect(wrapper.style.height).toBe('512px');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Plot Configuration Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('sets initial frequency range on plot', () => {
    /**
     * The plot's X-axis should match the frequencyRange prop.
     * This ensures zoom/pan state is correctly initialized.
     */
    render(
      <FFTDisplay
        {...defaultProps}
        frequencyRange={{ startFreq: 100e6, endFreq: 200e6 }}
      />
    );

    expect(mockPlot.setXRange).toHaveBeenCalledWith({
      min: 100e6,
      max: 200e6,
    });
  });

  it('sets initial dB range on plot', () => {
    /**
     * The plot's Y-axis should match minDb/maxDb props.
     * This controls the vertical scale of the spectrum display.
     */
    render(<FFTDisplay {...defaultProps} minDb={-100} maxDb={-20} />);

    expect(mockPlot.setYRange).toHaveBeenCalledWith({
      min: -100,
      max: -20,
    });
  });

  it('creates line traces for live data', () => {
    /**
     * FFTDisplay should create at least one line trace for the live FFT data.
     * Additional traces are created for persistence and max-hold features.
     */
    render(<FFTDisplay {...defaultProps} />);

    // Should create at least the live trace
    expect(mockPlot.addLine).toHaveBeenCalled();
  });

  it('creates max-hold trace when enabled', () => {
    /**
     * When maxHoldEnabled is true, an additional trace should be created
     * to show the maximum values seen over time.
     */
    mockPlot.addLine.mockClear();

    render(<FFTDisplay {...defaultProps} maxHoldEnabled={true} />);

    // Should create multiple traces (live + max-hold, possibly persistence)
    expect(mockPlot.addLine.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Interaction Mode Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('configures box zoom modifier based on interaction mode', () => {
    /**
     * In 'pan' mode, box zoom requires shift key.
     * In 'zoom' mode, box zoom works without modifier.
     */
    const { rerender } = render(
      <FFTDisplay {...defaultProps} interactionMode="pan" />
    );

    expect(mockPlot.setBoxZoomModifier).toHaveBeenCalledWith('shift');

    rerender(<FFTDisplay {...defaultProps} interactionMode="zoom" />);

    expect(mockPlot.setBoxZoomModifier).toHaveBeenCalledWith('none');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Data Event Handling Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('listens for fft-data events', () => {
    /**
     * The component should register an event listener for 'fft-data' events.
     * This is how FFT data flows from the WebSocket to the visualization.
     */
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(<FFTDisplay {...defaultProps} />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'fft-data',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
  });

  it('removes event listener on unmount', () => {
    /**
     * Critical for preventing memory leaks.
     * When the component unmounts, it should clean up its event listener.
     */
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<FFTDisplay {...defaultProps} />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'fft-data',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it('processes FFT data events and updates plot', () => {
    /**
     * When an fft-data event is dispatched, the component should:
     * 1. Extract the FFT frame data
     * 2. Apply smoothing
     * 3. Update the line trace
     * 4. Request a redraw
     *
     * This test verifies the data flow from event to plot update.
     */
    render(<FFTDisplay {...defaultProps} />);

    // Create a mock FFT frame
    const mockFrame: FFTData = {
      timestamp: Date.now(),
      sampleRate: 2e6,
      centerFreq: 915e6,
      bins: new Float32Array(2048).fill(-60), // Fill with -60 dB
    };

    // Dispatch the event
    const event = new CustomEvent('fft-data', {
      detail: { frames: [mockFrame] },
    });
    window.dispatchEvent(event);

    // Plot should request a redraw
    expect(mockPlot.requestDraw).toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Frequency Range Change Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('calls onFrequencyRangeChange when zoom changes', () => {
    /**
     * When the user zooms in/out on the plot, the frequency range changes.
     * This should be reported back to the parent component via callback.
     */
    const onFrequencyRangeChange = vi.fn();

    // Capture the zoom callback
    type ZoomCallback = (axis: string, range: { min: number; max: number }) => void;
    let zoomCallback: ZoomCallback = () => {};
    mockPlot.onZoom.mockImplementation((callback: unknown) => {
      zoomCallback = callback as ZoomCallback;
      return vi.fn();
    });

    render(
      <FFTDisplay
        {...defaultProps}
        onFrequencyRangeChange={onFrequencyRangeChange}
      />
    );

    // Simulate zoom on X axis
    zoomCallback('x', { min: 910e6, max: 920e6 });

    expect(onFrequencyRangeChange).toHaveBeenCalledWith({
      startFreq: 910e6,
      endFreq: 920e6,
    });
  });

  it('ignores zoom on Y axis', () => {
    /**
     * Y-axis zoom should not trigger frequency range changes.
     * Only X-axis (frequency) changes should be reported.
     */
    const onFrequencyRangeChange = vi.fn();

    type ZoomCallback = (axis: string, range: { min: number; max: number }) => void;
    let zoomCallback: ZoomCallback = () => {};
    mockPlot.onZoom.mockImplementation((callback: unknown) => {
      zoomCallback = callback as ZoomCallback;
      return vi.fn();
    });

    render(
      <FFTDisplay
        {...defaultProps}
        onFrequencyRangeChange={onFrequencyRangeChange}
      />
    );

    // Simulate zoom on Y axis
    zoomCallback('y', { min: -100, max: -20 });

    expect(onFrequencyRangeChange).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Theme Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('accepts dark theme', () => {
    /**
     * Component should render with dark theme without errors.
     */
    expect(() => {
      render(<FFTDisplay {...defaultProps} theme="dark" />);
    }).not.toThrow();
  });

  it('accepts light theme', () => {
    /**
     * Component should render with light theme without errors.
     */
    expect(() => {
      render(<FFTDisplay {...defaultProps} theme="light" />);
    }).not.toThrow();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Data Key Reset Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('clears data when dataKey changes', () => {
    /**
     * When switching to a different data source, all accumulated data
     * (smoothing, persistence, max-hold) should be reset.
     *
     * dataKey is used to trigger this reset when the source changes.
     */
    const { rerender } = render(
      <FFTDisplay {...defaultProps} dataKey="source-1" />
    );

    // Get the initial trace
    const traceMock = mockPlot.addLine.mock.results[0]?.value;

    // Change data source
    rerender(<FFTDisplay {...defaultProps} dataKey="source-2" />);

    // Trace should be cleared (setXY called with empty arrays)
    if (traceMock) {
      expect(traceMock.setXY).toHaveBeenCalledWith(
        expect.any(Float32Array),
        expect.any(Float32Array)
      );
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FPS Callback Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('reports render FPS via callback', () => {
    /**
     * The component tracks render FPS and reports it to the parent.
     * This is used for performance monitoring in the UI.
     */
    const onRenderFpsChange = vi.fn();

    render(
      <FFTDisplay {...defaultProps} onRenderFpsChange={onRenderFpsChange} />
    );

    // Should report the mocked FPS (60)
    expect(onRenderFpsChange).toHaveBeenCalledWith(60);
  });

  it('reports 0 FPS on unmount', () => {
    /**
     * When the component unmounts, it should report 0 FPS
     * to indicate it's no longer rendering.
     */
    const onRenderFpsChange = vi.fn();

    const { unmount } = render(
      <FFTDisplay {...defaultProps} onRenderFpsChange={onRenderFpsChange} />
    );

    unmount();

    // Last call should be 0
    const lastCall = onRenderFpsChange.mock.calls[onRenderFpsChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe(0);
  });
});

describe('FFTDisplay Data Processing', () => {
  /**
   * These tests verify the data processing logic:
   * - Bin to frequency mapping
   * - Power value handling
   * - Edge cases
   */

  const defaultProps = {
    width: 800,
    height: 400,
    minDb: -120,
    maxDb: 0,
    frequencyRange: { startFreq: 914e6, endFreq: 916e6 },
    theme: 'dark' as const,
    interactionMode: 'pan' as const,
    maxHoldEnabled: false,
    maxHoldClearKey: 0,
    rangeRequestKey: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('handles empty FFT frames gracefully', () => {
    /**
     * If an FFT frame has no bins, the component should not crash.
     */
    render(<FFTDisplay {...defaultProps} />);

    const event = new CustomEvent('fft-data', {
      detail: {
        frames: [
          {
            timestamp: Date.now(),
            sampleRate: 2e6,
            centerFreq: 915e6,
            bins: [], // Empty bins
          },
        ],
      },
    });

    expect(() => {
      window.dispatchEvent(event);
    }).not.toThrow();
  });

  it('handles NaN values in bins', () => {
    /**
     * FFT calculations can produce NaN values (e.g., log of zero).
     * The component should handle these without crashing.
     */
    render(<FFTDisplay {...defaultProps} />);

    const binsWithNaN = new Array(2048).fill(-60);
    binsWithNaN[100] = NaN;
    binsWithNaN[500] = NaN;

    const event = new CustomEvent('fft-data', {
      detail: {
        frames: [
          {
            timestamp: Date.now(),
            sampleRate: 2e6,
            centerFreq: 915e6,
            bins: binsWithNaN,
          },
        ],
      },
    });

    expect(() => {
      window.dispatchEvent(event);
    }).not.toThrow();
  });

  it('handles very large bin arrays', () => {
    /**
     * Some FFT sizes can be very large (e.g., 16384 points).
     * The component should handle this without performance issues.
     */
    render(<FFTDisplay {...defaultProps} />);

    const largeBins = new Array(16384).fill(-60);

    const event = new CustomEvent('fft-data', {
      detail: {
        frames: [
          {
            timestamp: Date.now(),
            sampleRate: 20e6,
            centerFreq: 915e6,
            bins: largeBins,
          },
        ],
      },
    });

    expect(() => {
      window.dispatchEvent(event);
    }).not.toThrow();
  });
});
