import { ReactNode } from 'react'
import { X, BarChart3, ListTodo, Activity, Settings, Sun, Moon, Upload } from 'lucide-react'
import { SettingsMenuItem } from '../settings/SettingsMenu'

export type MobileView = 'visualization' | 'tasks' | 'status'

export interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  currentView: MobileView
  onViewChange: (view: MobileView) => void
  onOpenSettings: (item: SettingsMenuItem) => void
  isDarkMode: boolean
  onToggleTheme: () => void
  healthIndicator?: {
    dotColor: string
    glow?: string
  }
}

interface NavItemProps {
  icon: ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition ${
        isActive
          ? 'bg-slate-100 text-slate-900 dark:bg-cockpit-accent/20 dark:text-white'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      <span className={isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      {isActive && (
        <span className="ml-auto h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />
      )}
    </button>
  )
}

interface SettingsItemProps {
  icon: ReactNode
  label: string
  onClick: () => void
}

function SettingsItem({ icon, label, onClick }: SettingsItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  )
}

/**
 * Mobile navigation drawer for switching between views and accessing settings.
 * Only visible on narrow screens (< 1024px).
 */
export function MobileNav({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  onOpenSettings,
  isDarkMode,
  onToggleTheme,
  healthIndicator,
}: MobileNavProps) {
  if (!isOpen) return null

  const handleViewChange = (view: MobileView) => {
    onViewChange(view)
    onClose()
  }

  const handleSettingsClick = (item: SettingsMenuItem) => {
    onOpenSettings(item)
    onClose()
  }

  const handleThemeToggle = () => {
    onToggleTheme()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 lg:hidden"
        onClick={onClose}
      />

      {/* Navigation Drawer */}
      <div className="fixed left-0 top-0 z-50 h-screen w-[280px] animate-in slide-in-from-left duration-200 flex flex-col overflow-hidden bg-white shadow-lg dark:bg-slate-900 lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
              Navigation
            </h2>
            {healthIndicator && (
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: healthIndicator.dotColor,
                  boxShadow: healthIndicator.glow,
                }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Close menu"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* View Navigation */}
          <div className="space-y-1">
            <NavItem
              icon={<BarChart3 size={20} />}
              label="Visualization"
              isActive={currentView === 'visualization'}
              onClick={() => handleViewChange('visualization')}
            />
            <NavItem
              icon={<ListTodo size={20} />}
              label="Tasks"
              isActive={currentView === 'tasks'}
              onClick={() => handleViewChange('tasks')}
            />
            <NavItem
              icon={<Activity size={20} />}
              label="Status"
              isActive={currentView === 'status'}
              onClick={() => handleViewChange('status')}
            />
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-slate-200 dark:border-white/10" />

          {/* Settings & Theme */}
          <div className="space-y-1">
            <SettingsItem
              icon={<Settings size={20} />}
              label="System Settings"
              onClick={() => handleSettingsClick('system')}
            />
            <SettingsItem
              icon={<Settings size={20} />}
              label="Display Settings"
              onClick={() => handleSettingsClick('display')}
            />
            <SettingsItem
              icon={<Settings size={20} />}
              label="Version Info"
              onClick={() => handleSettingsClick('version')}
            />
            <SettingsItem
              icon={<Upload size={20} />}
              label="System Update"
              onClick={() => handleSettingsClick('update')}
            />
            <button
              type="button"
              onClick={handleThemeToggle}
              className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="text-slate-500 dark:text-slate-400">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </span>
              <span className="font-medium">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
