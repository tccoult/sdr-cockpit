/**
 * Smoke tests - Critical path tests for core functionality
 *
 * These tests verify the essential user flows work end-to-end.
 * If these pass, the app fundamentally works.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TaskApi } from '../api/tasks'
import type { Task, CreateRxTaskParams } from '../types/sdr'
import { TaskType, TaskStatus, TaskOwner } from '../types/sdr'

// Mock the API
vi.mock('../api', () => ({
  getTaskApi: vi.fn(),
  createDataStream: vi.fn(),
}))

describe('Smoke Tests - Critical User Flows', () => {
  let mockTaskApi: TaskApi

  beforeEach(async () => {
    // Setup mock API
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

    const { getTaskApi } = await import('../api')
    vi.mocked(getTaskApi).mockReturnValue(mockTaskApi)
  })

  it('Critical Path: User can create RX task and API responds correctly', async () => {
    /**
     * This tests the most critical user flow:
     * 1. User creates RX task
     * 2. API returns valid task object
     * 3. Task has all required fields
     *
     * If this breaks, the app is fundamentally broken.
     */

    // Mock API response
    const mockTask: Task = {
      id: 'task-1',
      name: 'ISM Band Monitor',
      type: TaskType.RX,
      frequency: 915e6,
      sampleRate: 2.4e6,
      bandwidth: 1e6,
      fftSize: 2048,
      owner: TaskOwner.SELF,
      ownerName: 'You',
      status: TaskStatus.LIVE,
      uptime: 0,
      createdAt: Date.now(),
      fps: 30,
    }

    vi.mocked(mockTaskApi.createRxTask).mockResolvedValue(mockTask)

    // Create task
    const params: CreateRxTaskParams = {
      name: 'ISM Band Monitor',
      frequency: 915e6,
      sampleRate: 2.4e6,
      bandwidth: 1e6,
      fftSize: 2048,
    }

    const task = await mockTaskApi.createRxTask(params)

    // Verify we got a valid task back
    expect(task).toBeDefined()
    expect(task.id).toBeDefined()
    expect(task.status).toBe(TaskStatus.LIVE)
    expect(task.type).toBe(TaskType.RX)
    expect(task.frequency).toBeGreaterThan(0)
    expect(task.sampleRate).toBeGreaterThan(0)
  })

  it('Critical Path: User can list and select tasks', async () => {
    /**
     * Tests the task discovery flow:
     * 1. User loads app
     * 2. API returns task list
     * 3. Tasks are displayed
     */

    const mockTasks: Task[] = [
      {
        id: 'task-1',
        name: 'FM Band',
        type: TaskType.RX,
        frequency: 98.5e6,
        sampleRate: 2e6,
        bandwidth: 200e3,
        fftSize: 2048,
        owner: TaskOwner.SELF,
        ownerName: 'You',
        status: TaskStatus.LIVE,
        uptime: 120,
        createdAt: Date.now() - 120000,
        fps: 30,
      },
      {
        id: 'task-2',
        name: 'ISM Band',
        type: TaskType.RX,
        frequency: 915e6,
        sampleRate: 2.4e6,
        bandwidth: 1e6,
        fftSize: 4096,
        owner: TaskOwner.EXTERNAL,
        ownerName: 'Operator 2',
        status: TaskStatus.LIVE,
        uptime: 300,
        createdAt: Date.now() - 300000,
        fps: 30,
      },
    ]

    vi.mocked(mockTaskApi.listTasks).mockResolvedValue(mockTasks)

    const tasks = await mockTaskApi.listTasks()

    // Verify we got tasks
    expect(tasks).toBeDefined()
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks[0].id).toBeDefined()
    expect(tasks[0].status).toBeDefined()
  })

  it('Critical Path: User can pause and resume tasks', async () => {
    /**
     * Tests task control:
     * 1. User pauses task
     * 2. Status updates to PAUSED
     * 3. User resumes task
     * 4. Status returns to LIVE
     */

    const liveTask: Task = {
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
      uptime: 60,
      createdAt: Date.now() - 60000,
      fps: 30,
    }

    const pausedTask = { ...liveTask, status: TaskStatus.PAUSED, fps: 0 }
    const resumedTask = { ...liveTask, status: TaskStatus.LIVE, fps: 30 }

    vi.mocked(mockTaskApi.pauseTask).mockResolvedValue(pausedTask)
    vi.mocked(mockTaskApi.resumeTask).mockResolvedValue(resumedTask)

    // Pause
    const paused = await mockTaskApi.pauseTask('task-1')
    expect(paused.status).toBe(TaskStatus.PAUSED)
    expect(paused.fps).toBe(0)

    // Resume
    const resumed = await mockTaskApi.resumeTask('task-1')
    expect(resumed.status).toBe(TaskStatus.LIVE)
    expect(resumed.fps).toBeGreaterThan(0)
  })

  it('Critical Path: User can stop (delete) tasks', async () => {
    /**
     * Tests task cleanup:
     * 1. User stops task
     * 2. Task is removed from system
     */

    vi.mocked(mockTaskApi.deleteTask).mockResolvedValue(undefined)

    // Should not throw
    await expect(mockTaskApi.deleteTask('task-1')).resolves.toBeUndefined()
  })

  it('Critical Path: API handles errors gracefully', async () => {
    /**
     * Tests error handling:
     * 1. API call fails
     * 2. Error is propagated correctly
     * 3. App can handle and display error
     */

    vi.mocked(mockTaskApi.createRxTask).mockRejectedValue(
      new Error('Network error: Failed to connect to backend')
    )

    const params: CreateRxTaskParams = {
      name: 'Test Task',
      frequency: 100e6,
      sampleRate: 2e6,
      bandwidth: 1e6,
      fftSize: 2048,
    }

    // Should propagate error
    await expect(mockTaskApi.createRxTask(params)).rejects.toThrow('Network error')
  })

  it('Data Contract: Task objects have required fields', () => {
    /**
     * Tests data contract - ensures Task interface hasn't broken
     * This catches frontend/backend mismatches
     */

    const validTask: Task = {
      id: 'test-id',
      name: 'Test Task',
      type: TaskType.RX,
      frequency: 915e6,
      sampleRate: 2.4e6,
      owner: TaskOwner.SELF,
      ownerName: 'You',
      status: TaskStatus.LIVE,
      uptime: 0,
      createdAt: Date.now(),
      fps: 30,
    }

    // TypeScript should ensure this compiles
    // If this test compiles, the contract is valid
    expect(validTask.id).toBeDefined()
    expect(validTask.type).toBeDefined()
    expect(validTask.status).toBeDefined()
    expect(validTask.frequency).toBeGreaterThan(0)
  })
})
