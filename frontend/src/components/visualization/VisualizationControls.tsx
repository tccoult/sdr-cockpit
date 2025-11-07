import { Hand, ZoomIn, Settings } from 'lucide-react'
import { Button } from '../common/Button'
import { useTheme } from '../app/useTheme'

export type InteractionMode = 'pan' | 'zoom'

export interface VisualizationControlsProps {
  interactionMode: InteractionMode
  onInteractionModeChange: (mode: InteractionMode) => void
  minDb: number
  maxDb: number
  onMinDbChange: (value: number) => void
  onMaxDbChange: (value: number) => void
  onAutoRange: () => void
}

/**
 * Bottom control bar for spectrum visualization.
 * Includes pan/zoom toggle, dB range controls, and settings.
 */
export function VisualizationControls({
  interactionMode,
  onInteractionModeChange,
  minDb,
  maxDb,
  onMinDbChange,
  onMaxDbChange,
  onAutoRange,
}: VisualizationControlsProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const inputClasses = [
    'h-8 w-20 rounded-md border px-2 text-xs transition focus:outline-none focus-visible:ring-2',
    'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cockpit-accent focus-visible:ring-cockpit-accent/40',
    'dark:border-white/20 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-white/40 dark:focus-visible:ring-white/40',
  ].join(' ')

  return (
    <div
      className={[
        'flex items-center justify-between gap-4 rounded-lg border px-4 py-2',
        isDark
          ? 'border-white/10 bg-slate-950/60'
          : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      {/* Left: Interaction Mode Toggle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onInteractionModeChange('pan')}
          className={[
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition',
            interactionMode === 'pan'
              ? 'border-cockpit-accent/50 bg-cockpit-accent/10 text-slate-900 shadow-sm dark:border-white/40 dark:bg-cockpit-accent/20 dark:text-white'
              : 'border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400 hover:bg-slate-200 dark:border-white/20 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-slate-800',
          ].join(' ')}
          title="Pan mode - Click and drag to pan"
        >
          <Hand size={14} />
          <span>Pan</span>
        </button>

        <div className="mx-1 h-4 w-px bg-slate-300 dark:bg-white/20" />

        <button
          type="button"
          onClick={() => onInteractionModeChange('zoom')}
          className={[
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition',
            interactionMode === 'zoom'
              ? 'border-cockpit-accent/50 bg-cockpit-accent/10 text-slate-900 shadow-sm dark:border-white/40 dark:bg-cockpit-accent/20 dark:text-white'
              : 'border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400 hover:bg-slate-200 dark:border-white/20 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-slate-800',
          ].join(' ')}
          title="Zoom mode - Click and drag to zoom to range"
        >
          <ZoomIn size={14} />
          <span>Zoom</span>
        </button>
      </div>

      {/* Center/Right: dB Controls */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <label htmlFor="min-db-ctrl">Min dB:</label>
          <input
            id="min-db-ctrl"
            type="number"
            value={minDb}
            onChange={(event) => onMinDbChange(Number(event.target.value))}
            className={inputClasses}
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="max-db-ctrl">Max dB:</label>
          <input
            id="max-db-ctrl"
            type="number"
            value={maxDb}
            onChange={(event) => onMaxDbChange(Number(event.target.value))}
            className={inputClasses}
          />
        </div>

        <Button size="sm" variant="subtle" onClick={onAutoRange}>
          Auto Range
        </Button>

        {/* Placeholder for future advanced settings */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-600 transition hover:border-slate-400 hover:bg-slate-200 dark:border-white/20 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-slate-800"
          title="Display settings (coming soon)"
          disabled
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  )
}
