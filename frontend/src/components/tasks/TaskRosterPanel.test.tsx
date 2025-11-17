import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Task, TaskType, TaskStatus, TaskOwner } from '../../api/client'
import { TaskRosterPanel } from './TaskRosterPanel'

type MockTaskCardProps = {
  task: Task
  isSelected: boolean
  onSelect: (taskId: string) => void
}

vi.mock('./TaskCard', () => ({
  TaskCard: ({ task, isSelected, onSelect }: MockTaskCardProps) => (
    <div
      data-testid="task-card"
      data-task-id={task.id}
      data-selected={isSelected}
      onClick={() => onSelect(task.id)}
    >
      {task.name}
    </div>
  ),
}))

const baseTask: Task = {
  id: 'task-1',
  name: 'Example Task',
  type: TaskType.RX,
  frequency: 100,
  sampleRate: 1_000,
  owner: TaskOwner.SELF,
  ownerName: 'Operator',
  status: TaskStatus.LIVE,
  uptime: 0,
  createdAt: 0,
}

const createTask = (overrides: Partial<Task>): Task => ({
  ...baseTask,
  ...overrides,
})

describe('TaskRosterPanel', () => {
  it('sorts tasks by created time and highlights the selected task', () => {
    const onSelectTask = vi.fn()
    const tasks = [
      createTask({ id: 'a', name: 'Older', createdAt: 1_000 }),
      createTask({ id: 'b', name: 'Newest', createdAt: 2_000 }),
      createTask({ id: 'c', name: 'Middle', createdAt: 1_500 }),
    ]

    render(
      <TaskRosterPanel
        tasks={tasks}
        isDiscovering={false}
        onCreateTask={vi.fn()}
        onTaskInteraction={onSelectTask}
      />
    )

    const renderedTasks = screen.getAllByTestId('task-card')
    expect(renderedTasks.map((node) => node.getAttribute('data-task-id'))).toEqual([
      'b',
      'c',
      'a',
    ])
  })

  it('filters tasks by type and shows empty state messaging', () => {
    const tasks = [
      createTask({ id: 'rx-1', name: 'RX Task', type: TaskType.RX, createdAt: 1_000 }),
    ]

    render(
      <TaskRosterPanel
        tasks={tasks}
        isDiscovering={false}
        onCreateTask={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /tx/i }))

    expect(screen.getByText('No TX tasks')).toBeInTheDocument()
    expect(screen.getByText('No TX tasks available')).toBeInTheDocument()
  })

  it('calls onCreateTask from both the header action and empty state', () => {
    const onCreateTask = vi.fn()

    render(
      <TaskRosterPanel
        tasks={[]}
        isDiscovering={false}
        onCreateTask={onCreateTask}
      />
    )

    fireEvent.click(screen.getByLabelText('Create new task'))
    fireEvent.click(screen.getByRole('button', { name: '+ Create Task' }))

    expect(onCreateTask).toHaveBeenCalledTimes(2)
  })

  it('shows discovery state when discovering with no tasks', () => {
    render(
      <TaskRosterPanel
        tasks={[]}
        isDiscovering
        onCreateTask={vi.fn()}
      />
    )

    expect(screen.getByText('Discovering tasks...')).toBeInTheDocument()
    expect(screen.getByText('Scanning SDR system')).toBeInTheDocument()
  })
})
