import { ReactNode, useEffect, useRef } from 'react'
import { Pin, PinOff, X } from 'lucide-react'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  position?: 'left' | 'right'
  title: string
  children: ReactNode
  isPinned: boolean
  onTogglePin: () => void
  width?: string
  offsetTop?: number
}

/**
 * Reusable drawer component that slides in from left or right.
 * Supports pinning to keep drawer open persistently.
 */
export function Drawer({
  isOpen,
  onClose,
  position = 'left',
  title,
  children,
  isPinned,
  onTogglePin,
  width = '300px',
  offsetTop = 0,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Handle ESC key
  useEffect(() => {
    if (!isOpen || isPinned) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isPinned, onClose])

  // Handle click outside
  useEffect(() => {
    if (!isOpen || isPinned) return

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Small delay to avoid immediate close when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isPinned, onClose])

  if (!isOpen) return null

  // Always apply offsetTop so drawer starts below header whether pinned or unpinned
  const appliedHeight = offsetTop > 0 ? `calc(100vh - ${offsetTop}px)` : '100vh'

  const slideAnimation = position === 'left'
    ? 'animate-in slide-in-from-left duration-200'
    : 'animate-in slide-in-from-right duration-200'

  const positionStyles = position === 'left'
    ? 'left-0'
    : 'right-0'

  return (
    <>
      {/* Backdrop - only show when not pinned */}
      {!isPinned && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 ${positionStyles} z-50 h-screen ${slideAnimation} flex flex-col overflow-hidden rounded-none border-r border-slate-300 bg-white shadow-2xl shadow-slate-900/25 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/60`}
        style={{ width, top: offsetTop, height: appliedHeight }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-4 py-3 dark:border-white/10 dark:bg-slate-950/50">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePin}
              className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              title={isPinned ? 'Unpin drawer' : 'Pin drawer'}
              aria-label={isPinned ? 'Unpin drawer' : 'Pin drawer'}
            >
              {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              title="Close drawer"
              aria-label="Close drawer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
