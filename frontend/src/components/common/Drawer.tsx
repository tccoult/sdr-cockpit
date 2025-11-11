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
        className={`fixed top-0 ${positionStyles} z-50 h-screen ${slideAnimation} flex flex-col overflow-hidden rounded-none border-r border-border/60 bg-muted/70 shadow-[0_18px_36px_rgba(15,23,42,0.18)] backdrop-blur-lg dark:border-border/40 dark:bg-muted/20 dark:shadow-[0_24px_48px_rgba(0,0,0,0.55)]`}
        style={{ width, top: offsetTop, height: appliedHeight }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card/90 px-4 py-3.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-border/40 dark:bg-card/25">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePin}
              className="rounded-md border border-transparent p-1.5 text-muted-foreground transition hover:border-border/60 hover:bg-card/70 hover:text-foreground dark:hover:bg-card/35"
              title={isPinned ? 'Unpin drawer' : 'Pin drawer'}
              aria-label={isPinned ? 'Unpin drawer' : 'Pin drawer'}
            >
              {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-transparent p-1.5 text-muted-foreground transition hover:border-border/60 hover:bg-card/70 hover:text-foreground dark:hover:bg-card/35"
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
