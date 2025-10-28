/**
 * TaskSidebar component - displays task list with filters and controls
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Task } from '../../types/sdr';
import { TaskCard } from './TaskCard';

type FilterType = 'all' | 'rx' | 'tx';

interface TaskSidebarProps {
  tasks: Task[];
  selectedTaskId: string | null;
  isDiscovering: boolean;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  onPauseTask?: (taskId: string) => void;
  onStopTask?: (taskId: string) => void;
  onSettingsTask?: (taskId: string) => void;
  onRecordTask?: (taskId: string) => void;
  onStopRecording?: (taskId: string) => void;
}

export function TaskSidebar({
  tasks,
  selectedTaskId,
  isDiscovering,
  onSelectTask,
  onCreateTask,
  onPauseTask,
  onStopTask,
  onSettingsTask,
  onRecordTask,
  onStopRecording,
}: TaskSidebarProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter tasks based on selected filter
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.type === filter;
  });

  // Sort tasks by creation time (newest first) - NO auto-sort by selection
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    return b.createdAt - a.createdAt;
  });

  return (
    <div
      style={{
        width: 280,
        height: '100vh',
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#ffffff',
          }}
        >
          Tasks
        </h2>

        <button
          onClick={onCreateTask}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Create new task"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {(['all', 'rx', 'tx'] as FilterType[]).map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              background:
                filter === filterType
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(255, 255, 255, 0.05)',
              border:
                filter === filterType
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 6,
              color: filter === filterType ? 'white' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              if (filter !== filterType) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== filterType) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
          >
            {filterType}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
        }}
      >
        {isDiscovering && tasks.length === 0 ? (
          // Loading state
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <div
              style={{
                fontSize: 32,
                marginBottom: 12,
                animation: 'spin 2s linear infinite',
              }}
            >
              ⟳
            </div>
            <div style={{ fontSize: 14 }}>Discovering tasks...</div>
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              Scanning SDR system
            </div>

            <style>
              {`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        ) : sortedTasks.length === 0 ? (
          // Empty state
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              No {filter !== 'all' ? filter.toUpperCase() : ''} tasks
            </div>
            <div style={{ fontSize: 12, marginBottom: 20, opacity: 0.7 }}>
              {filter === 'all'
                ? 'Create a receive task to start monitoring RF spectrum'
                : `No ${filter.toUpperCase()} tasks available`}
            </div>
            {filter === 'all' && (
              <button
                onClick={onCreateTask}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                + Create Task
              </button>
            )}
          </div>
        ) : (
          // Task cards
          sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
              onSelect={onSelectTask}
              onPause={onPauseTask}
              onStop={onStopTask}
              onSettings={onSettingsTask}
              onRecord={onRecordTask}
              onStopRecording={onStopRecording}
            />
          ))
        )}
      </div>

      {/* Footer info */}
      {tasks.length > 0 && (
        <div
          style={{
            padding: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center',
          }}
        >
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} available
          {filteredTasks.length !== tasks.length &&
            ` (${filteredTasks.length} shown)`}
        </div>
      )}
    </div>
  );
}
