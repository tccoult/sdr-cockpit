import { TreeView } from '../common/TreeView'
import { SystemVersion } from '../../types/diagnostics'

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
    <div className="flex flex-col gap-4 p-4">
      {/* Overall Info */}
      <section className="rounded-sm border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/50">
        <div className="space-y-2">
          <InfoRow label="Version" value={overallVersion} highlight />
          <InfoRow label="Build Date" value={buildDate} />
          <InfoRow label="Platform" value={platform} />
        </div>
      </section>

      {/* Component Versions */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Component Versions
        </h3>
        <div className="rounded-sm border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/50">
          <TreeView<SystemVersion>
            data={versionTree}
            renderNode={(node) => (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {node.name}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-slate-900 dark:text-white">
                    {node.version}
                  </span>
                  {node.commitHash && (
                    <span className="font-mono text-slate-400 dark:text-slate-600">
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
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? 'text-status-success dark:text-status-success' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </span>
    </div>
  )
}
