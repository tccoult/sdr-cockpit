import { useEffect, useRef, useState } from 'react'
import { Settings, Monitor, Info, Upload, ChevronRight } from 'lucide-react'

export type SettingsMenuItem = 'system' | 'display' | 'version' | 'update'

export interface SettingsMenuProps {
  onSelectItem: (item: SettingsMenuItem) => void
}

/**
 * Settings dropdown menu that appears from the header.
 * Shows options for system settings, display settings, version info, and system update.
 */
export function SettingsMenu({ onSelectItem }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelectItem = (item: SettingsMenuItem) => {
    setIsOpen(false)
    onSelectItem(item)
  }

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        aria-label="Settings"
        title="Settings"
      >
        <Settings size={16} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full z-[70] mt-2 w-56 animate-in fade-in slide-in-from-top-1 duration-100 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900"
        >
          <div className="p-1 pr-1">
            <MenuItem
              icon={<Settings size={16} />}
              label="System Settings"
              onClick={() => handleSelectItem('system')}
            />
            <MenuItem
              icon={<Monitor size={16} />}
              label="Display Settings"
              onClick={() => handleSelectItem('display')}
            />
            <MenuItem
              icon={<Info size={16} />}
              label="Version Info"
              onClick={() => handleSelectItem('version')}
            />

            <div className="my-1 h-px bg-slate-200 dark:bg-white/10" />

            <MenuItem
              icon={<Upload size={16} />}
              label="System Update..."
              onClick={() => handleSelectItem('update')}
              iconRight={<ChevronRight size={14} />}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  iconRight?: React.ReactNode
}

function MenuItem({ icon, label, onClick, iconRight }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-all duration-150 ease-in-out hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <span className="flex-shrink-0 text-slate-500 transition-all duration-150 ease-in-out group-hover:brightness-125 dark:text-slate-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {iconRight && (
        <span className="flex-shrink-0 text-slate-400 transition-all duration-150 ease-in-out group-hover:brightness-125 dark:text-slate-500">{iconRight}</span>
      )}
    </button>
  )
}
