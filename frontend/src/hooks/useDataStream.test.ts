/**
 * Tests for useDataStream hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDataStream } from './useDataStream'
import type { DataStreamCallbacks, DataStreamStatus } from '../api/websocket'
import { FFTDataBatch, VisualizationMode } from '../types/sdr'

// Mock the API module
vi.mock('../api', () => ({
  createDataStream: vi.fn(),
}))

// Mock dispatchFFTData
vi.mock('../utils/mockDataGenerator', () => ({
  dispatchFFTData: vi.fn(),
}))

describe('useDataStream', () => {
  let mockStreamController: {
    disconnect: ReturnType<typeof vi.fn>
    pause?: ReturnType<typeof vi.fn>
    resume?: ReturnType<typeof vi.fn>
    triggerData: (batch: FFTDataBatch) => void
    triggerStatusChange: (status: DataStreamStatus) => void
    triggerError: (error: string) => void
  }

  beforeEach(async () => {
    // Create mock stream controller
    let callbacks: DataStreamCallbacks | null = null

    mockStreamController = {
      disconnect: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      triggerData: (batch: FFTDataBatch) => callbacks?.onData(batch),
      triggerStatusChange: (status: DataStreamStatus) => callbacks?.onStatusChange(status),
      triggerError: (error: string) => callbacks?.onError?.(error),
    }

    // Mock createDataStream
    const { createDataStream } = await import('../api')
    vi.mocked(createDataStream).mockImplementation((_taskId, cb) => {
      callbacks = cb
      return mockStreamController
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should start with disconnected state', () => {
      const { result } = renderHook(() =>
        useDataStream({
          taskId: null,
        })
      )

      expect(result.current.fps).toBe(0)
      expect(result.current.streamStatus).toBe('disconnected')
      expect(result.current.streamError).toBe(null)
    })

    it('should not connect without taskId', async () => {
      const { createDataStream } = await import('../api')

      renderHook(() =>
        useDataStream({
          taskId: null,
          centerFreq: 100e6,
          sampleRate: 2e6,
        })
      )

      expect(createDataStream).not.toHaveBeenCalled()
    })

    it('should not connect when disabled', async () => {
      const { createDataStream } = await import('../api')

      renderHook(() =>
        useDataStream({
          taskId: 'task-1',
          centerFreq: 100e6,
          sampleRate: 2e6,
          enabled: false,
        })
      )

      expect(createDataStream).not.toHaveBeenCalled()
    })

    it('should not connect without frequency/sample rate', async () => {
      const { createDataStream } = await import('../api')

      renderHook(() =>
        useDataStream({
          taskId: 'task-1',
        })
      )

      expect(createDataStream).not.toHaveBeenCalled()
    })

    it('should connect when all required params provided', async () => {
      const { createDataStream } = await import('../api')

      renderHook(() =>
        useDataStream({
          taskId: 'task-1',
          centerFreq: 100e6,
          sampleRate: 2e6,
          fftSize: 2048,
        })
      )

      expect(createDataStream).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          onData: expect.any(Function),
          onStatusChange: expect.any(Function),
          onError: expect.any(Function),
        }),
        expect.objectContaining({
          centerFreq: 100e6,
          sampleRate: 2e6,
          fftSize: 2048,
        })
      )
    })
  })

  describe('Status Changes', () => {
    it('should update stream status', () => {
      const { result } = renderHook(() =>
        useDataStream({
          taskId: 'task-1',
          centerFreq: 100e6,
          sampleRate: 2e6,
        })
      )

      act(() => {
        mockStreamController.triggerStatusChange('connecting')
      })
      expect(result.current.streamStatus).toBe('connecting')

      act(() => {
        mockStreamController.triggerStatusChange('connected')
      })
      expect(result.current.streamStatus).toBe('connected')

      act(() => {
        mockStreamController.triggerStatusChange('error')
      })
      expect(result.current.streamStatus).toBe('error')
    })

    it('should update stream error', () => {
      const { result } = renderHook(() =>
        useDataStream({
          taskId: 'task-1',
          centerFreq: 100e6,
          sampleRate: 2e6,
        })
      )

      act(() => {
        mockStreamController.triggerError('Connection failed')
      })

      expect(result.current.streamError).toBe('Connection failed')
    })
  })

  describe('FPS Tracking', () => {
    it.skip('should calculate FPS from incoming data', async () => {
      vi.useFakeTimers()
      try {
        const { result } = renderHook(() =>
          useDataStream({
            taskId: 'task-1',
            centerFreq: 100e6,
            sampleRate: 2e6,
          })
        )

        // Send 30 frames
        act(() => {
          for (let i = 0; i < 30; i++) {
            mockStreamController.triggerData({
              frames: [
                {
                  timestamp: Date.now(),
                  centerFreq: 100e6,
                  sampleRate: 2e6,
                  bins: new Float32Array(2048),
                },
              ],
            })
          }
        })

        // Advance time by 1 second to trigger FPS update
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Trigger one more frame to update FPS
        act(() => {
          mockStreamController.triggerData({
            frames: [
              {
                timestamp: Date.now(),
                centerFreq: 100e6,
                sampleRate: 2e6,
                bins: new Float32Array(2048),
              },
            ],
          })
        })

        await waitFor(() => {
          expect(result.current.fps).toBe(30)
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it.skip('should count frames in batches', async () => {
      vi.useFakeTimers()
      try {
        const { result } = renderHook(() =>
          useDataStream({
            taskId: 'task-1',
            centerFreq: 100e6,
            sampleRate: 2e6,
          })
        )

        // Send 2 batches of 25 frames each = 50 frames total
        act(() => {
          mockStreamController.triggerData({
            frames: Array(25)
              .fill(null)
              .map(() => ({
                timestamp: Date.now(),
                centerFreq: 100e6,
                sampleRate: 2e6,
                bins: new Float32Array(2048),
              })),
          })
          mockStreamController.triggerData({
            frames: Array(25)
              .fill(null)
              .map(() => ({
                timestamp: Date.now(),
                centerFreq: 100e6,
                sampleRate: 2e6,
                bins: new Float32Array(2048),
              })),
          })
        })

        // Advance time by 1 second
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Trigger one more frame to update FPS
        act(() => {
          mockStreamController.triggerData({
            frames: [
              {
                timestamp: Date.now(),
                centerFreq: 100e6,
                sampleRate: 2e6,
                bins: new Float32Array(2048),
              },
            ],
          })
        })

        await waitFor(() => {
          expect(result.current.fps).toBe(50)
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it('should reset FPS when paused', () => {
      const { result, rerender } = renderHook(
        ({ paused }) =>
          useDataStream({
            taskId: 'task-1',
            centerFreq: 100e6,
            sampleRate: 2e6,
            paused,
          }),
        { initialProps: { paused: false } }
      )

      // Send some frames
      act(() => {
        for (let i = 0; i < 10; i++) {
          mockStreamController.triggerData({
            frames: [
              {
                timestamp: Date.now(),
                centerFreq: 100e6,
                sampleRate: 2e6,
                bins: new Float32Array(2048),
              },
            ],
          })
        }
      })

      // Pause the stream
      rerender({ paused: true })

      expect(mockStreamController.pause).toHaveBeenCalled()
      expect(result.current.fps).toBe(0)
    })
  })

  describe('Pause/Resume', () => {
    it('should call pause when paused prop changes to true', () => {
      const { rerender } = renderHook(
        ({ paused }) =>
          useDataStream({
            taskId: 'task-1',
            centerFreq: 100e6,
            sampleRate: 2e6,
            paused,
          }),
        { initialProps: { paused: false } }
      )

      rerender({ paused: true })

      expect(mockStreamController.pause).toHaveBeenCalled()
    })

    it('should call resume when paused prop changes to false', () => {
      const { rerender } = renderHook(
        ({ paused }) =>
          useDataStream({
            taskId: 'task-1',
            centerFreq: 100e6,
            sampleRate: 2e6,
            paused,
          }),
        { initialProps: { paused: true } }
      )

      rerender({ paused: false })

      expect(mockStreamController.resume).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() =>
        useDataStream({
          taskId: 'task-1',
          centerFreq: 100e6,
          sampleRate: 2e6,
        })
      )

      unmount()

      expect(mockStreamController.disconnect).toHaveBeenCalled()
    })

    it('should disconnect and reconnect when taskId changes', async () => {
      const { createDataStream } = await import('../api')
      const { rerender } = renderHook(
        ({ taskId }) =>
          useDataStream({
            taskId,
            centerFreq: 100e6,
            sampleRate: 2e6,
          }),
        { initialProps: { taskId: 'task-1' } }
      )

      expect(createDataStream).toHaveBeenCalledTimes(1)
      expect(createDataStream).toHaveBeenLastCalledWith(
        'task-1',
        expect.anything(),
        expect.anything()
      )

      // Change task ID
      rerender({ taskId: 'task-2' })

      expect(mockStreamController.disconnect).toHaveBeenCalled()
      expect(createDataStream).toHaveBeenCalledTimes(2)
      expect(createDataStream).toHaveBeenLastCalledWith(
        'task-2',
        expect.anything(),
        expect.anything()
      )
    })

    it('should disconnect when enabled changes to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useDataStream({
            taskId: 'task-1',
            centerFreq: 100e6,
            sampleRate: 2e6,
            enabled,
          }),
        { initialProps: { enabled: true } }
      )

      rerender({ enabled: false })

      expect(mockStreamController.disconnect).toHaveBeenCalled()
    })

    it('should reset state when taskId becomes null', () => {
      const { result, rerender } = renderHook(
        ({ taskId }) =>
          useDataStream({
            taskId,
            centerFreq: 100e6,
            sampleRate: 2e6,
          }),
        { initialProps: { taskId: 'task-1' as string | null } }
      )

      // Give it some data first
      act(() => {
        mockStreamController.triggerStatusChange('connected')
        mockStreamController.triggerData({
          frames: [
            {
              timestamp: Date.now(),
              centerFreq: 100e6,
              sampleRate: 2e6,
              bins: new Float32Array(2048),
            },
          ],
        })
      })

      // Change to null
      rerender({ taskId: null })

      expect(result.current.fps).toBe(0)
      expect(result.current.streamStatus).toBe('disconnected')
      expect(result.current.streamError).toBe(null)
    })
  })

  describe('Visualization Mode', () => {
    it('should pass visualization mode to createDataStream', async () => {
      const { createDataStream } = await import('../api')

      renderHook(() =>
        useDataStream({
          taskId: 'task-1',
          centerFreq: 100e6,
          sampleRate: 2e6,
          visualizationMode: VisualizationMode.SPECTROGRAM,
        })
      )

      expect(createDataStream).toHaveBeenCalledWith(
        'task-1',
        expect.anything(),
        expect.objectContaining({
          visualizationMode: VisualizationMode.SPECTROGRAM,
        })
      )
    })
  })

  describe('Data Dispatching', () => {
    it('should dispatch FFT data through event system', async () => {
      const { dispatchFFTData } = await import('../utils/mockDataGenerator')

      renderHook(() =>
        useDataStream({
          taskId: 'task-1',
          centerFreq: 100e6,
          sampleRate: 2e6,
        })
      )

      const frames = [
        {
          timestamp: Date.now(),
          centerFreq: 100e6,
          sampleRate: 2e6,
          bins: new Float32Array(2048),
        },
      ]

      act(() => {
        mockStreamController.triggerData({ frames })
      })

      expect(dispatchFFTData).toHaveBeenCalledWith(frames)
    })
  })
})
