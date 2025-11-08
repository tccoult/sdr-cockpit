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
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-white/10">
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
        )}
        {activeTab === 'diagnostics' && (
          <DiagnosticsTab bistResult={bistResult} />
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
      className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium transition ${
        active
          ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
          : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
