/**
 * Display settings panel with placeholder visualization options.
 */
export function DisplaySettings() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Visualization
        </h3>
        <div className="space-y-3">
          <SettingRow
            label="Default Color Map"
            value="Plasma"
            disabled
          />
          <SettingRow
            label="FFT Averaging"
            value="None"
            disabled
          />
          <SettingRow
            label="Waterfall History"
            value="512 frames"
            disabled
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Performance
        </h3>
        <div className="space-y-3">
          <SettingRow
            label="Target Render FPS"
            value="60"
            disabled
          />
          <SettingRow
            label="GPU Acceleration"
            value="Enabled"
            disabled
          />
          <SettingRow
            label="Decimation Mode"
            value="Min-Max"
            disabled
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Interface
        </h3>
        <div className="space-y-3">
          <SettingRow
            label="Panel Layout"
            value="Pinned"
            disabled
          />
          <SettingRow
            label="Font Size"
            value="Default"
            disabled
          />
        </div>
      </section>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300">
        ℹ️ Configuration options coming soon
      </div>
    </div>
  )
}

interface SettingRowProps {
  label: string
  value: string
  disabled?: boolean
}

function SettingRow({ label, value, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/50">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <span className={`text-xs font-semibold ${disabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </span>
    </div>
  )
}
