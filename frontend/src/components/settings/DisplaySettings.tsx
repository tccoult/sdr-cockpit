/**
 * Display settings panel with placeholder visualization options.
 */
export function DisplaySettings() {
  return (
    <div className="flex flex-col gap-6 rounded-sm border border-border/70 bg-card p-4 text-foreground shadow-sm">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
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
        <h3 className="mb-3 text-sm font-semibold text-foreground">
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
        <h3 className="mb-3 text-sm font-semibold text-foreground">
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
