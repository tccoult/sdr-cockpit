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
  isLastChild?: boolean
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
  isLastChild = false,
}: TreeViewProps<T>) {
  const shouldAutoExpand = autoExpandCondition?.(data) ?? defaultExpanded
  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand)

  const hasChildren = data.children && data.children.length > 0
  const indent = level * 8 // 8px per level

  return (
    <div className={`relative ${className}`}>
      {/* Node Row */}
      <div className="relative flex items-start gap-2 py-1.5 transition-colors duration-150 ease-in-out hover:bg-slate-50 dark:hover:bg-slate-800/50"
        style={{ paddingLeft: `${indent}px` }}>

        {/* Tree connectors (L-shaped lines) */}
        {level > 0 && (
          <>
            {/* Vertical line from parent */}
            <div
              className="absolute top-0 w-px bg-slate-300 dark:bg-slate-600"
              style={{
                left: `${indent - 8}px`,
                height: '12px', // Reaches down to horizontal line
              }}
            />
            {/* Horizontal line */}
            <div
              className="absolute top-3 h-px bg-slate-300 dark:bg-slate-600"
              style={{
                left: `${indent - 8}px`,
                width: hasChildren ? '6px' : '14px', // Shorter for parent nodes, longer for leaf nodes
              }}
            />
            {/* Vertical line continuing to next sibling (if not last) */}
            {!isLastChild && (
              <div
                className="absolute bottom-0 w-px bg-slate-300 dark:bg-slate-600"
                style={{
                  left: `${indent - 8}px`,
                  top: '12px', // Start after the horizontal connection point
                }}
              />
            )}
          </>
        )}

        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative z-10 mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-slate-500 transition-all duration-150 ease-in-out hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
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
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          {data.children!.map((child, index) => (
            <TreeView
              key={child.id}
              data={child as T}
              renderNode={renderNode}
              defaultExpanded={defaultExpanded}
              autoExpandCondition={autoExpandCondition}
              level={level + 1}
              isLastChild={index === data.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
