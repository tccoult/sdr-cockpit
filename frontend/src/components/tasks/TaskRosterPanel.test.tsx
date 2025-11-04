import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Task } from '../../types/sdr'
import { TaskRosterPanel } from './TaskRosterPanel'

vi.mock('./TaskCard', () => ({
  TaskCard: ({ task, isSelected, onSelect }: any) => (
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
  type: 'rx',
  frequency: 100,
  sampleRate: 1_000,
  owner: 'self',
  ownerName: 'Operator',
  status: 'live',
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
        selectedTaskId="b"
        isDiscovering={false}
        onSelectTask={onSelectTask}
        onCreateTask={vi.fn()}
      />
    )

    const renderedTasks = screen.getAllByTestId('task-card')
    expect(renderedTasks.map((node) => node.getAttribute('data-task-id'))).toEqual([
      'b',
      'c',
      'a',
    ])

    expect(renderedTasks[0].getAttribute('data-selected')).toBe('true')

    fireEvent.click(renderedTasks[1])
    expect(onSelectTask).toHaveBeenCalledWith('c')
  })

  it('filters tasks by type and shows empty state messaging', () => {
    const tasks = [
      createTask({ id: 'rx-1', name: 'RX Task', type: 'rx', createdAt: 1_000 }),
    ]

    render(
      <TaskRosterPanel
        tasks={tasks}
        selectedTaskId={null}
        isDiscovering={false}
        onSelectTask={vi.fn()}
        onCreateTask={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'tx' }))

    expect(screen.getByText('No TX tasks')).toBeInTheDocument()
    expect(screen.getByText('No TX tasks available')).toBeInTheDocument()
  })

  it('calls onCreateTask from both the header action and empty state', () => {
    const onCreateTask = vi.fn()

    render(
      <TaskRosterPanel
        tasks={[]}
        selectedTaskId={null}
        isDiscovering={false}
        onSelectTask={vi.fn()}
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
        selectedTaskId={null}
        isDiscovering
        onSelectTask={vi.fn()}
        onCreateTask={vi.fn()}
      />
    )

    expect(screen.getByText('Discovering tasks...')).toBeInTheDocument()
    expect(screen.getByText('Scanning SDR system')).toBeInTheDocument()
  })
})
