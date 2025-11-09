import { useState } from 'react'
import { Task } from '../../types/sdr'
import { HealthStatus } from '../layout/CompactHeader'
import { DataStreamStatus } from '../../api'
import { BistResult } from '../../types/diagnostics'
import { OverviewTab } from './OverviewTab'
import { DiagnosticsTab } from './DiagnosticsTab'

export interface StatusPanelProps {
  dataFps: number
  renderFps: number
  totalTasks: number
  operatorTasks: number
  selectedTask: Task | null
  streamStatus: DataStreamStatus
  streamError: string | null
  healthStatus: HealthStatus
  bistResult: BistResult | null
}

type TabId = 'overview' | 'diagnostics'

/**
 * Tabbed status panel showing system overview and diagnostics.
 * Replaces the old HealthDrawer with expanded functionality.
 */
export function StatusPanel({
  dataFps,
  renderFps,
  totalTasks,
  operatorTasks,
  selectedTask,
  streamStatus,
  streamError,
  healthStatus,
  bistResult,
}: StatusPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="flex h-full flex-col">
      {/* Tab Navigation - Sticky */}
      <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === 'diagnostics'}
          onClick={() => setActiveTab('diagnostics')}
        >
          Diagnostics
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-150">
            <OverviewTab
              dataFps={dataFps}
              renderFps={renderFps}
              totalTasks={totalTasks}
              operatorTasks={operatorTasks}
              selectedTask={selectedTask}
              streamStatus={streamStatus}
              streamError={streamError}
              healthStatus={healthStatus}
            />
          </div>
        )}
        {activeTab === 'diagnostics' && (
          <div className="animate-in fade-in slide-in-from-right-2 duration-150">
            <DiagnosticsTab bistResult={bistResult} />
          </div>
        )}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-all duration-150 ease-in-out ${
        active
          ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
