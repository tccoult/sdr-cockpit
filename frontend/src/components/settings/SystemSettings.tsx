/**
 * System settings panel with placeholder configuration options.
 */
export function SystemSettings() {
  return (
    <div className="flex flex-col gap-6 rounded-sm border border-border/70 bg-card p-4 text-foreground shadow-sm">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
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
        <h3 className="mb-3 text-sm font-semibold text-foreground">
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
        <h3 className="mb-3 text-sm font-semibold text-foreground">
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

      <div className="rounded-md border border-border/70 bg-muted/60 p-3 text-xs text-muted-foreground">
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
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold ${disabled ? 'text-muted-foreground/80' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}
