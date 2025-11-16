/**
 * Tests for useTasks hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTasks } from '../useTasks'
import { Task, TaskType, TaskStatus, TaskOwner, CreateRxTaskParams, CreateTxTaskParams } from '../../types/sdr'
import type { TaskApi } from '../../api/tasks'

// Mock the API module
vi.mock('../../api', () => ({
  getTaskApi: vi.fn(),
}))

// Mock task generator utilities
vi.mock('../../utils/mockTaskGenerator', () => ({
  updateRecording: vi.fn((task, seconds) => {
    if (!task.recording) return task
    return {
      ...task,
      recording: {
        ...task.recording,
        duration: task.recording.duration + seconds,
        fileSize: task.recording.fileSize + seconds * 2_000_000,
      },
    }
  }),
  updateTaskUptime: vi.fn((task) => ({
    ...task,
    uptime: task.uptime + 1,
  })),
  updateTxProgress: vi.fn((task, seconds) => {
    if (!task.playback) return task
    const duration = task.playback.duration || 60
    const newProgress = Math.min(100, task.playback.progress + (seconds / duration) * 100)
    return {
      ...task,
      playback: {
        ...task.playback,
        progress: newProgress,
      },
    }
  }),
}))

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  name: 'Test Task',
  type: TaskType.RX,
  frequency: 100e6,
  sampleRate: 2e6,
  bandwidth: 1e6,
  fftSize: 2048,
  owner: TaskOwner.SELF,
  ownerName: 'You',
  status: TaskStatus.LIVE,
  uptime: 0,
  createdAt: Date.now(),
  fps: 30,
  visualizationMode: undefined,
  recording: undefined,
  playback: undefined,
  ...overrides,
})

describe('useTasks', () => {
  let mockTaskApi: TaskApi

  beforeEach(async () => {
    // Create mock task API
    mockTaskApi = {
      listTasks: vi.fn().mockResolvedValue([]),
      createRxTask: vi.fn(),
      createTxTask: vi.fn(),
      getTask: vi.fn(),
      deleteTask: vi.fn(),
      pauseTask: vi.fn(),
      resumeTask: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
    }

    // Mock getTaskApi to return our mock
    const { getTaskApi } = await import('../../api')
    vi.mocked(getTaskApi).mockReturnValue(mockTaskApi)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should start with discovering state', async () => {
      const { result } = renderHook(() => useTasks())

      expect(result.current.isDiscovering).toBe(true)
      expect(result.current.tasks).toEqual([])
      expect(result.current.selectedTaskId).toBe(null)
    })

    it('should load tasks on mount', async () => {
      const mockTasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })]
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isDiscovering).toBe(false)
      })

      expect(result.current.tasks).toEqual(mockTasks)
      expect(mockTaskApi.listTasks).toHaveBeenCalledOnce()
    })

    it('should auto-select first task', async () => {
      const mockTasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })]
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.selectedTaskId).toBe('task-1')
      })

      expect(result.current.selectedTask).toEqual(mockTasks[0])
    })

    it('should handle empty task list', async () => {
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([])

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isDiscovering).toBe(false)
      })

      expect(result.current.tasks).toEqual([])
      expect(result.current.selectedTaskId).toBe(null)
      expect(result.current.selectedTask).toBe(null)
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(mockTaskApi.listTasks).mockRejectedValue(new Error('API Error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isDiscovering).toBe(false)
      })

      expect(result.current.tasks).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Task Selection', () => {
    it('should select task by ID', async () => {
      const mockTasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })]
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(2)
      })

      act(() => {
        result.current.selectTask('task-2')
      })

      expect(result.current.selectedTaskId).toBe('task-2')
      expect(result.current.selectedTask?.id).toBe('task-2')
    })
  })

  describe('Create Tasks', () => {
    it('should create RX task and add to list', async () => {
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([])
      const newTask = createMockTask({ id: 'task-1' })
      vi.mocked(mockTaskApi.createRxTask).mockResolvedValue(newTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isDiscovering).toBe(false)
      })

      const params: CreateRxTaskParams = {
        name: 'New RX Task',
        frequency: 100e6,
        sampleRate: 2e6,
        bandwidth: 1e6,
        fftSize: 2048,
      }

      await act(async () => {
        await result.current.createRxTask(params)
      })

      expect(mockTaskApi.createRxTask).toHaveBeenCalledWith(params)
      expect(result.current.tasks).toContainEqual(newTask)
      expect(result.current.selectedTaskId).toBe('task-1')
    })

    it('should create TX task and add to list', async () => {
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([])
      const newTask = createMockTask({ id: 'task-1', type: TaskType.TX })
      vi.mocked(mockTaskApi.createTxTask).mockResolvedValue(newTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isDiscovering).toBe(false)
      })

      const params: CreateTxTaskParams = {
        name: 'New TX Task',
        file: new File([], 'test.sigmf'),
        frequency: 433.92e6,
        loop: true,
      }

      await act(async () => {
        await result.current.createTxTask(params)
      })

      expect(mockTaskApi.createTxTask).toHaveBeenCalledWith(params)
      expect(result.current.tasks).toContainEqual(newTask)
      expect(result.current.selectedTaskId).toBe('task-1')
    })

    it('should handle create task errors', async () => {
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([])
      vi.mocked(mockTaskApi.createRxTask).mockRejectedValue(new Error('Create failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isDiscovering).toBe(false)
      })

      const params: CreateRxTaskParams = {
        name: 'New RX Task',
        frequency: 100e6,
        sampleRate: 2e6,
        bandwidth: 1e6,
        fftSize: 2048,
      }

      await expect(async () => {
        await act(async () => {
          await result.current.createRxTask(params)
        })
      }).rejects.toThrow('Create failed')

      expect(result.current.tasks).toEqual([])
      consoleSpy.mockRestore()
    })
  })

  describe('Pause/Resume Tasks', () => {
    it('should pause a running task', async () => {
      const mockTask = createMockTask({ id: 'task-1', status: TaskStatus.LIVE })
      const pausedTask = { ...mockTask, status: TaskStatus.PAUSED, fps: 0 }
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([mockTask])
      vi.mocked(mockTaskApi.pauseTask).mockResolvedValue(pausedTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(1)
      })

      await act(async () => {
        await result.current.pauseTask('task-1')
      })

      expect(mockTaskApi.pauseTask).toHaveBeenCalledWith('task-1')
      expect(result.current.tasks[0].status).toBe(TaskStatus.PAUSED)
    })

    it('should resume a paused task', async () => {
      const mockTask = createMockTask({ id: 'task-1', status: TaskStatus.PAUSED, fps: 0 })
      const resumedTask = { ...mockTask, status: TaskStatus.LIVE, fps: 30 }
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([mockTask])
      vi.mocked(mockTaskApi.resumeTask).mockResolvedValue(resumedTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(1)
      })

      await act(async () => {
        await result.current.pauseTask('task-1')
      })

      expect(mockTaskApi.resumeTask).toHaveBeenCalledWith('task-1')
      expect(result.current.tasks[0].status).toBe(TaskStatus.LIVE)
    })
  })

  describe('Stop Tasks', () => {
    it('should delete task and remove from list', async () => {
      const mockTasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })]
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue(mockTasks)
      vi.mocked(mockTaskApi.deleteTask).mockResolvedValue(undefined)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(2)
      })

      await act(async () => {
        await result.current.stopTask('task-1')
      })

      expect(mockTaskApi.deleteTask).toHaveBeenCalledWith('task-1')
      expect(result.current.tasks.length).toBe(1)
      expect(result.current.tasks[0].id).toBe('task-2')
    })

    it('should auto-select another task when deleting selected task', async () => {
      const mockTasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })]
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue(mockTasks)
      vi.mocked(mockTaskApi.deleteTask).mockResolvedValue(undefined)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.selectedTaskId).toBe('task-1')
      })

      await act(async () => {
        await result.current.stopTask('task-1')
      })

      expect(result.current.selectedTaskId).toBe('task-2')
    })

    it('should set selectedTaskId to null when deleting last task', async () => {
      const mockTasks = [createMockTask({ id: 'task-1' })]
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue(mockTasks)
      vi.mocked(mockTaskApi.deleteTask).mockResolvedValue(undefined)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(1)
      })

      await act(async () => {
        await result.current.stopTask('task-1')
      })

      expect(result.current.tasks).toEqual([])
      expect(result.current.selectedTaskId).toBe(null)
    })
  })

  describe('Recording', () => {
    it('should start recording on a task', async () => {
      const mockTask = createMockTask({ id: 'task-1' })
      const recordingTask = {
        ...mockTask,
        recording: {
          filename: 'recording.sigmf',
          duration: 0,
          fileSize: 0,
          isRecording: true,
        },
      }
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([mockTask])
      vi.mocked(mockTaskApi.startRecording).mockResolvedValue(recordingTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(1)
      })

      await act(async () => {
        await result.current.startRecording('task-1')
      })

      expect(mockTaskApi.startRecording).toHaveBeenCalledWith('task-1')
      expect(result.current.tasks[0].recording).not.toBe(null)
      expect(result.current.tasks[0].recording?.isRecording).toBe(true)
    })

    it('should stop recording on a task', async () => {
      const mockTask = createMockTask({
        id: 'task-1',
        recording: {
          filename: 'recording.sigmf',
          duration: 10,
          fileSize: 20_000_000,
          isRecording: true,
        },
      })
      const stoppedTask = { ...mockTask, recording: undefined }
      vi.mocked(mockTaskApi.listTasks).mockResolvedValue([mockTask])
      vi.mocked(mockTaskApi.stopRecording).mockResolvedValue(stoppedTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(1)
      })

      await act(async () => {
        await result.current.stopRecording('task-1')
      })

      expect(mockTaskApi.stopRecording).toHaveBeenCalledWith('task-1')
      expect(result.current.tasks[0].recording).toBeUndefined()
    })
  })

  describe('Automatic Updates', () => {
    it.skip('should update task uptimes every second', async () => {
      vi.useFakeTimers()
      try {
        const mockTask = createMockTask({ id: 'task-1', uptime: 0 })
        vi.mocked(mockTaskApi.listTasks).mockResolvedValue([mockTask])

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.tasks.length).toBe(1)
        })

        const initialUptime = result.current.tasks[0].uptime

        // Advance timer by 1 second
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        await waitFor(() => {
          expect(result.current.tasks[0].uptime).toBeGreaterThan(initialUptime)
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it.skip('should update recording duration and file size', async () => {
      vi.useFakeTimers()
      try {
        const mockTask = createMockTask({
          id: 'task-1',
          recording: {
            filename: 'test.sigmf',
            duration: 0,
            fileSize: 0,
            isRecording: true,
          },
        })
        vi.mocked(mockTaskApi.listTasks).mockResolvedValue([mockTask])

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.tasks.length).toBe(1)
        })

        const initialDuration = result.current.tasks[0].recording?.duration || 0

        // Advance timer by 1 second
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        await waitFor(() => {
          const duration = result.current.tasks[0].recording?.duration || 0
          expect(duration).toBeGreaterThan(initialDuration)
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it.skip('should update TX task playback progress', async () => {
      vi.useFakeTimers()
      try {
        const mockTask = createMockTask({
          id: 'task-1',
          type: TaskType.TX,
          status: TaskStatus.TRANSMITTING,
          playback: {
            filename: 'test.sigmf',
            progress: 0,
            isLooping: false,
            duration: 60,
          },
        })
        vi.mocked(mockTaskApi.listTasks).mockResolvedValue([mockTask])

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.tasks.length).toBe(1)
        })

        const initialProgress = result.current.tasks[0].playback?.progress || 0

        // Advance timer by 1 second
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        await waitFor(() => {
          const progress = result.current.tasks[0].playback?.progress || 0
          expect(progress).toBeGreaterThan(initialProgress)
        })
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
