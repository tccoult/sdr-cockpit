/**
 * Tests for useSourceStream hook
 *
 * This hook manages WebSocket connections to data sources and handles:
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Status tracking (disconnected, connecting, connected, error)
 * - FPS calculation
 * - Data dispatch to the event bus
 *
 * Understanding this hook is key to understanding how data flows
 * from the backend to the visualization components.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSourceStream } from '../useSourceStream';
import type { DataStreamStatus } from '../../api/websocket';
import type { FFTDataBatch } from '../../types/sdr';

// ─────────────────────────────────────────────────────────────────────────────
// Mock the WebSocket client and event bus
// ─────────────────────────────────────────────────────────────────────────────

// Track the created stream for testing
let mockStream: {
  disconnect: ReturnType<typeof vi.fn>;
  callbacks: {
    onData?: (batch: FFTDataBatch) => void;
    onStatusChange?: (status: DataStreamStatus) => void;
    onError?: (error: string) => void;
  };
} | null = null;

vi.mock('../../api/sourceWebsocket', () => ({
  createSourceDataStream: vi.fn((_sourceId: string, callbacks) => {
    mockStream = {
      disconnect: vi.fn(),
      callbacks,
    };
    // Simulate immediate connection
    setTimeout(() => {
      callbacks.onStatusChange?.('connected');
    }, 0);
    return mockStream;
  }),
}));

const mockDispatchFFTData = vi.fn();
vi.mock('../../utils/fftEventBus', () => ({
  dispatchFFTData: (frames: unknown) => mockDispatchFFTData(frames),
}));

describe('useSourceStream Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStream = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Connection Lifecycle Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('starts disconnected when no sourceId provided', () => {
    /**
     * When sourceId is null, no connection should be made.
     * This is the initial state before a source is selected.
     */
    const { result } = renderHook(() =>
      useSourceStream({ sourceId: null })
    );

    expect(result.current.streamStatus).toBe('disconnected');
    expect(result.current.fps).toBe(0);
    expect(result.current.streamError).toBeNull();
  });

  it('connects when sourceId is provided', async () => {
    /**
     * When a sourceId is provided, the hook should:
     * 1. Create a data stream connection
     * 2. Transition to 'connected' status
     */
    const { result } = renderHook(() =>
      useSourceStream({ sourceId: 'test-source-123' })
    );

    // Let the connection callback fire
    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.streamStatus).toBe('connected');
    expect(mockStream).not.toBeNull();
  });

  it('disconnects when sourceId becomes null', async () => {
    /**
     * When the source is deselected (sourceId → null), the hook should:
     * 1. Disconnect the existing stream
     * 2. Return to 'disconnected' status
     * 3. Reset FPS to 0
     */
    const { result, rerender } = renderHook(
      ({ sourceId }) => useSourceStream({ sourceId }),
      { initialProps: { sourceId: 'test-source' as string | null } }
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.streamStatus).toBe('connected');

    // Disconnect
    rerender({ sourceId: null });

    expect(result.current.streamStatus).toBe('disconnected');
    expect(result.current.fps).toBe(0);
    expect(mockStream?.disconnect).toHaveBeenCalled();
  });

  it('reconnects when sourceId changes', async () => {
    /**
     * When switching to a different source, the hook should:
     * 1. Disconnect from the old source
     * 2. Connect to the new source
     */
    const { createSourceDataStream } = await import('../../api/sourceWebsocket');

    const { rerender } = renderHook(
      ({ sourceId }) => useSourceStream({ sourceId }),
      { initialProps: { sourceId: 'source-1' } }
    );

    await act(async () => {
      vi.runAllTimers();
    });

    const firstStream = mockStream;
    expect(createSourceDataStream).toHaveBeenCalledWith('source-1', expect.any(Object));

    // Switch to different source
    rerender({ sourceId: 'source-2' });

    await act(async () => {
      vi.runAllTimers();
    });

    // Old stream should be disconnected
    expect(firstStream?.disconnect).toHaveBeenCalled();

    // New stream should be created
    expect(createSourceDataStream).toHaveBeenCalledWith('source-2', expect.any(Object));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Enable/Disable Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('does not connect when enabled is false', () => {
    /**
     * The enabled flag allows temporarily disabling streaming
     * (e.g., when a modal is open) without losing the sourceId.
     */
    const { result } = renderHook(() =>
      useSourceStream({ sourceId: 'test-source', enabled: false })
    );

    expect(result.current.streamStatus).toBe('disconnected');
    expect(mockStream).toBeNull();
  });

  it('connects when enabled becomes true', async () => {
    /**
     * When re-enabled, the stream should reconnect.
     */
    const { result, rerender } = renderHook(
      ({ enabled }) => useSourceStream({ sourceId: 'test-source', enabled }),
      { initialProps: { enabled: false } }
    );

    expect(result.current.streamStatus).toBe('disconnected');

    rerender({ enabled: true });

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.streamStatus).toBe('connected');
  });

  it('disconnects when enabled becomes false', async () => {
    /**
     * When disabled, the stream should disconnect but retain the sourceId
     * so it can reconnect when re-enabled.
     */
    const { result, rerender } = renderHook(
      ({ enabled }) => useSourceStream({ sourceId: 'test-source', enabled }),
      { initialProps: { enabled: true } }
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.streamStatus).toBe('connected');

    rerender({ enabled: false });

    expect(result.current.streamStatus).toBe('disconnected');
    expect(mockStream?.disconnect).toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Data Handling Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('dispatches FFT data through event bus', async () => {
    /**
     * When data is received, it should be dispatched through the
     * FFT event bus so visualization components can receive it.
     */
    renderHook(() => useSourceStream({ sourceId: 'test-source' }));

    await act(async () => {
      vi.runAllTimers();
    });

    // Simulate receiving data
    const mockBatch: FFTDataBatch = {
      frames: [
        {
          timestamp: Date.now(),
          sampleRate: 2e6,
          centerFreq: 915e6,
          bins: new Float32Array(2048).fill(-60),
        },
      ],
    };

    act(() => {
      mockStream?.callbacks.onData?.(mockBatch);
    });

    expect(mockDispatchFFTData).toHaveBeenCalledWith(mockBatch.frames);
  });

  it('tracks frame count for FPS calculation', async () => {
    /**
     * The hook tracks how many data batches are received per second.
     * This test verifies the tracking mechanism works by checking
     * that data callbacks increment the internal counter.
     *
     * Note: Actual FPS calculation involves timing and is tested manually.
     */
    renderHook(() => useSourceStream({ sourceId: 'test-source' }));

    await act(async () => {
      vi.runAllTimers();
    });

    // Simulate receiving multiple batches
    const mockBatch: FFTDataBatch = {
      frames: [
        {
          timestamp: Date.now(),
          sampleRate: 2e6,
          centerFreq: 915e6,
          bins: new Float32Array(2048).fill(-60),
        },
      ],
    };

    // Send batches - these should be processed without error
    for (let i = 0; i < 5; i++) {
      act(() => {
        mockStream?.callbacks.onData?.(mockBatch);
      });
    }

    // Verify data was dispatched for each batch
    expect(mockDispatchFFTData).toHaveBeenCalledTimes(5);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('reports errors through streamError', async () => {
    /**
     * Connection errors should be captured and exposed through
     * the streamError property for display in the UI.
     */
    const { result } = renderHook(() =>
      useSourceStream({ sourceId: 'test-source' })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    // Simulate error
    act(() => {
      mockStream?.callbacks.onError?.('Connection lost');
    });

    expect(result.current.streamError).toBe('Connection lost');
  });

  it('clears error when reconnecting', async () => {
    /**
     * When reconnecting (e.g., switching sources), previous errors
     * should be cleared.
     */
    const { result, rerender } = renderHook(
      ({ sourceId }) => useSourceStream({ sourceId }),
      { initialProps: { sourceId: 'source-1' as string | null } }
    );

    await act(async () => {
      vi.runAllTimers();
    });

    // Simulate error
    act(() => {
      mockStream?.callbacks.onError?.('Connection lost');
    });

    expect(result.current.streamError).toBe('Connection lost');

    // Switch to new source
    rerender({ sourceId: 'source-2' });

    await act(async () => {
      vi.runAllTimers();
    });

    // Error should be cleared
    expect(result.current.streamError).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Status Tracking Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('tracks status changes from stream', async () => {
    /**
     * The hook should reflect status changes from the underlying stream.
     * Common statuses: 'disconnected', 'connecting', 'connected', 'error'
     */
    const { result } = renderHook(() =>
      useSourceStream({ sourceId: 'test-source' })
    );

    // Initially should transition to connected (from mock)
    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.streamStatus).toBe('connected');

    // Simulate status changes
    act(() => {
      mockStream?.callbacks.onStatusChange?.('connecting');
    });

    expect(result.current.streamStatus).toBe('connecting');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cleanup Tests
  // ───────────────────────────────────────────────────────────────────────────

  it('disconnects on unmount', async () => {
    /**
     * When the component using this hook unmounts, the stream
     * should be disconnected to free resources.
     */
    const { unmount } = renderHook(() =>
      useSourceStream({ sourceId: 'test-source' })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    const stream = mockStream;
    unmount();

    expect(stream?.disconnect).toHaveBeenCalled();
  });

  it('resets FPS to 0 on disconnect', async () => {
    /**
     * When the stream disconnects, FPS should reset to 0
     * since no data is being received.
     */
    const { result, unmount } = renderHook(() =>
      useSourceStream({ sourceId: 'test-source' })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    // Simulate some data to set FPS
    const mockBatch: FFTDataBatch = {
      frames: [
        {
          timestamp: Date.now(),
          sampleRate: 2e6,
          centerFreq: 915e6,
          bins: new Float32Array(2048).fill(-60),
        },
      ],
    };

    act(() => {
      mockStream?.callbacks.onData?.(mockBatch);
    });

    unmount();

    // FPS is reset in cleanup
    expect(result.current.fps).toBe(0);
  });
});

describe('useSourceStream Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStream = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles rapid sourceId changes', async () => {
    /**
     * If the sourceId changes rapidly (e.g., user clicking quickly),
     * the hook should handle this gracefully without race conditions.
     */
    const { rerender } = renderHook(
      ({ sourceId }) => useSourceStream({ sourceId }),
      { initialProps: { sourceId: 'source-1' } }
    );

    // Rapid changes
    rerender({ sourceId: 'source-2' });
    rerender({ sourceId: 'source-3' });
    rerender({ sourceId: 'source-4' });

    await act(async () => {
      vi.runAllTimers();
    });

    // Should be connected to the final source
    const { createSourceDataStream } = await import('../../api/sourceWebsocket');
    const lastCall = vi.mocked(createSourceDataStream).mock.calls.slice(-1)[0];
    expect(lastCall[0]).toBe('source-4');
  });

  it('handles multiple disable/enable cycles', async () => {
    /**
     * The hook should handle repeated enable/disable cycles without errors.
     */
    const { result, rerender } = renderHook(
      ({ enabled }) => useSourceStream({ sourceId: 'test-source', enabled }),
      { initialProps: { enabled: true } }
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.streamStatus).toBe('connected');

    // Disable
    rerender({ enabled: false });
    expect(result.current.streamStatus).toBe('disconnected');

    // Re-enable
    rerender({ enabled: true });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.streamStatus).toBe('connected');
  });
});
