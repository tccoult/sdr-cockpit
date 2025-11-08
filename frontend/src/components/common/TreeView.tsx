import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface TreeNodeData {
  id: string
  children?: TreeNodeData[]
}

export interface TreeViewProps<T extends TreeNodeData> {
  data: T
  renderNode: (node: T, isExpanded: boolean) => ReactNode
  defaultExpanded?: boolean
  autoExpandCondition?: (node: T) => boolean
  level?: number
  className?: string
}

/**
 * Reusable recursive tree view component.
 * Supports custom rendering, auto-expansion, and proper indentation.
 */
export function TreeView<T extends TreeNodeData>({
  data,
  renderNode,
  defaultExpanded = false,
  autoExpandCondition,
  level = 0,
  className = '',
}: TreeViewProps<T>) {
  const shouldAutoExpand = autoExpandCondition?.(data) ?? defaultExpanded
  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand)

  const hasChildren = data.children && data.children.length > 0
  const indent = level * 8 // 8px per level

  return (
    <div className={className}>
      {/* Node Row */}
      <div
        className="group flex items-start gap-2 py-1.5 transition-colors duration-150 ease-in-out hover:bg-slate-50 dark:hover:bg-slate-800/50"
        style={{ paddingLeft: `${indent}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-slate-500 transition-all duration-150 ease-in-out hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <div className={`transition-transform duration-150 ease-in-out ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown size={14} />
            </div>
          </button>
        ) : (
          <div className="h-4 w-4 flex-shrink-0" />
        )}

        {/* Custom Node Content */}
        <div className="flex-1 overflow-hidden">{renderNode(data, isExpanded)}</div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Vertical line */}
          <div
            className="absolute top-0 h-full w-px bg-slate-200 transition-opacity duration-150 dark:bg-slate-700 group-hover:opacity-70"
            style={{ left: `${indent + 4}px` }}
          />
          {data.children!.map((child) => (
            <TreeView
              key={child.id}
              data={child as T}
              renderNode={renderNode}
              defaultExpanded={defaultExpanded}
              autoExpandCondition={autoExpandCondition}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
