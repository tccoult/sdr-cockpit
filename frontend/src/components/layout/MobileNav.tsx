import { ReactNode } from 'react'
import { X, BarChart3, ListTodo, Activity, Settings, Sun, Moon, Upload, ExternalLink } from 'lucide-react'
import { SettingsMenuItem } from '../settings/SettingsMenu'

export type MobileView = 'visualization' | 'tasks' | 'health'

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
      className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition ${
        isActive
          ? 'border-cockpit-accent/60 bg-cockpit-accent/10 text-foreground shadow-inner'
          : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground'
      }`}
    >
      <span className={isActive ? 'text-foreground' : 'text-muted-foreground'}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      {isActive && (
        <span className="ml-auto h-2 w-2 rounded-full bg-foreground" />
      )}
    </button>
  )
}

interface SettingsItemProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  href?: string
}

function SettingsItem({ icon, label, onClick, href }: SettingsItemProps) {
  const className =
    'flex w-full items-center gap-3 rounded-md border border-transparent px-4 py-3 text-left text-muted-foreground transition hover:border-border/70 hover:bg-muted/60 hover:text-foreground'

  const content = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium">{label}</span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
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

  const grafanaUrl =
    typeof window === 'undefined'
      ? 'http://localhost:3000'
      : `http://${window.location.hostname}:3000`

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
      <div className="fixed left-0 top-0 z-50 flex h-screen w-[280px] animate-in slide-in-from-left flex-col overflow-hidden border border-border/70 bg-card text-foreground shadow-2xl duration-200 lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 bg-card/80 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
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
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
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
              label="Health"
              isActive={currentView === 'health'}
              onClick={() => handleViewChange('health')}
            />
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-border/60" />

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
            <SettingsItem
              icon={<ExternalLink size={20} />}
              label="Open Grafana Dashboard"
              href={grafanaUrl}
              onClick={onClose}
            />
            <button
              type="button"
              onClick={handleThemeToggle}
              className="flex w-full items-center gap-3 rounded-md border border-transparent px-4 py-3 text-left text-muted-foreground transition hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
            >
              <span className="text-muted-foreground">
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
