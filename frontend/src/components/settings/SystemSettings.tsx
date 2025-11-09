/**
 * System settings panel with placeholder configuration options.
 */
export function SystemSettings() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Network
        </h3>
        <div className="space-y-3">
          <SettingRow
            label="Backend Address"
            value="localhost:8000"
            disabled
          />
          <SettingRow
            label="WebSocket Reconnect"
            value="Automatic"
            disabled
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Data Streaming
        </h3>
        <div className="space-y-3">
          <SettingRow
            label="Buffer Size"
            value="1024 frames"
            disabled
          />
          <SettingRow
            label="Max Data Rate"
            value="60 FPS"
            disabled
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Recording
        </h3>
        <div className="space-y-3">
          <SettingRow
            label="Default Format"
            value="SigMF"
            disabled
          />
          <SettingRow
            label="Output Directory"
            value="/var/sdr/recordings"
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
