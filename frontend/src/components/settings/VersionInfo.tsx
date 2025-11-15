import { TreeView } from '../common/TreeView'
import { SystemVersion } from '../../types/health'

export interface VersionInfoProps {
  versionTree: SystemVersion
  overallVersion: string
  buildDate: string
  platform: string
}

/**
 * Version information panel showing overall version and component tree.
 */
export function VersionInfo({ versionTree, overallVersion, buildDate, platform }: VersionInfoProps) {
  return (
    <div className="flex flex-col gap-6 rounded-sm border border-border/70 bg-card p-4 text-foreground shadow-sm">
      {/* Overall Info */}
      <section className="rounded-sm border border-border/60 bg-muted/40 p-4">
        <div className="space-y-2">
          <InfoRow label="Version" value={overallVersion} highlight />
          <InfoRow label="Build Date" value={buildDate} />
          <InfoRow label="Platform" value={platform} />
        </div>
      </section>

      {/* Component Versions */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Component Versions
        </h3>
        <div className="rounded-sm border border-border/60 bg-muted/40 p-3">
          <TreeView<SystemVersion>
            data={versionTree}
            renderNode={(node) => (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-foreground/90">
                  {node.name}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-foreground">
                    {node.version}
                  </span>
                  {node.commitHash && (
                    <span className="font-mono text-muted-foreground">
                      {node.commitHash.slice(0, 7)}
                    </span>
                  )}
                </div>
              </div>
            )}
            defaultExpanded={false}
          />
        </div>
      </section>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
  highlight?: boolean
}

function InfoRow({ label, value, highlight }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? 'text-status-success' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}
