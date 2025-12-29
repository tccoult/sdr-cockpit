import { ReactNode, useEffect, useState } from 'react'
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
  forcedExpandIds?: string[]
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
  forcedExpandIds,
}: TreeViewProps<T>) {
  const shouldAutoExpand = autoExpandCondition?.(data) ?? defaultExpanded
  const isForcedExpanded = forcedExpandIds?.includes(data.id) ?? false
  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand || isForcedExpanded)

  useEffect(() => {
    if (isForcedExpanded && !isExpanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with forced expand prop
      setIsExpanded(true)
    }
  }, [isForcedExpanded, isExpanded])

  const hasChildren = data.children && data.children.length > 0
  const indent = level * 8 // 8px per level

  return (
    <div className={`relative ${className}`}>
      {/* Vertical line continuing through this node to next sibling (if not last) */}
      {level > 0 && !isLastChild && (
        <div
          className="absolute w-px bg-border/60"
          style={{
            left: `${indent - 8}px`,
            top: '12px', // Start after the horizontal connection point
            bottom: '0',
          }}
        />
      )}

      {/* Node Row */}
      <div className="relative flex items-start gap-2 py-1.5 transition-colors duration-150 ease-in-out hover:bg-muted/70"
        style={{ paddingLeft: `${indent}px` }}>

        {/* Tree connectors (L-shaped lines) */}
        {level > 0 && (
          <>
            {/* Vertical line from parent down to horizontal junction */}
            <div
              className="absolute top-0 w-px bg-border/60"
              style={{
                left: `${indent - 8}px`,
                height: '12px',
              }}
            />
            {/* Horizontal line */}
            <div
              className="absolute top-3 h-px bg-border/60"
              style={{
                left: `${indent - 8}px`,
                width: hasChildren ? '6px' : '14px',
              }}
            />
          </>
        )}

        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative z-10 mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-muted-foreground transition-all duration-150 ease-in-out hover:bg-muted hover:text-foreground"
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
              forcedExpandIds={forcedExpandIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}
