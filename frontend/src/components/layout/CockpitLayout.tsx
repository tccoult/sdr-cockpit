import { HTMLAttributes, ReactNode, forwardRef } from 'react'

type DivProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode }

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

interface CockpitLayoutProps extends DivProps {
  /**
   * When true, the internal grid reserves an additional column for a future right rail.
   */
  hasRightRail?: boolean
}

/**
 * High-level cockpit layout that organizes telemetry (top), the task column (left),
 * and visualization canvas (center). By default, the grid spans two columns on large
 * screens—tasks on the left and primary visualizations on the right. Setting
 * `hasRightRail` pre-allocates a third column for upcoming modules without
 * reworking consumer components.
 */
export function CockpitLayout({
  children,
  className,
  hasRightRail = false,
  ...props
}: CockpitLayoutProps) {
  const columnTemplate = hasRightRail
    ? 'lg:grid-cols-[320px_minmax(0,1fr)_280px]'
    : 'lg:grid-cols-[320px_minmax(0,1fr)]'

  return (
    <div
      className={cn(
        'min-h-screen w-full bg-slate-100 text-slate-900 dark:bg-cockpit-surface dark:text-slate-100',
        'lg:h-screen lg:overflow-hidden',
        'font-sans',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-6 px-4 py-6',
          'lg:grid lg:grid-rows-[auto_1fr]',
          'lg:h-full lg:overflow-hidden lg:[&>*]:min-h-0',
          columnTemplate
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Header zone dedicated to high-level telemetry and global controls. The default
 * placement spans the full grid width so operators always see status panels above
 * the task roster and spotlight.
 */
export const CockpitHeaderZone = forwardRef<HTMLDivElement, DivProps>(
  ({ children, className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        'order-1 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/30',
        'lg:col-span-full',
        className
      )}
      {...props}
    >
      {children}
    </header>
  )
)

CockpitHeaderZone.displayName = 'CockpitHeaderZone'

interface CockpitColumnProps extends DivProps {
  position?: 'left' | 'center' | 'right'
}

/**
 * Column wrapper used to arrange spotlight/roster stacks or future telemetry rails.
 * On mobile the ordering becomes vertical; on large screens the `position` prop keeps
 * the active task spotlight + roster anchored to the left column by default.
 */
export function CockpitColumn({
  children,
  className,
  position = 'left',
  ...props
}: CockpitColumnProps) {
  const positionClasses: Record<'left' | 'center' | 'right', string> = {
    left: 'order-2 lg:order-1',
    center: 'order-3 lg:order-2',
    right: 'order-4 lg:order-3',
  }

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col gap-4',
        'lg:h-full lg:overflow-hidden',
        positionClasses[position],
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

/**
 * Container for the active task spotlight. Consumers should render the
 * operator-focused summary here; by default it lives at the top of the left column
 * ahead of the task roster.
 */
export function CockpitSpotlightSection({
  children,
  className,
  ...props
}: DivProps) {
  return (
    <section
      className={cn(
        'flex-none rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/70 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70 dark:shadow-cockpit-glow',
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

/**
 * Container for the full task roster. It flexes to fill remaining vertical space in
 * the left column so hundreds of tasks can scroll independently of the spotlight.
 */
export function CockpitRosterSection({
  children,
  className,
  ...props
}: DivProps) {
  return (
    <section
      className={cn(
        'flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60',
        'lg:h-full',
        'min-h-0',
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

/**
 * Primary visualization canvas wrapper. The element stretches to consume available
 * space and is intended for spectrum/waterfall displays.
 */
export function CockpitMainArea({
  children,
  className,
  ...props
}: DivProps) {
  return (
    <main
      className={cn(
        'flex flex-1 flex-col gap-6',
        className
      )}
      {...props}
    >
      {children}
    </main>
  )
}

/**
 * Utility grid for telemetry/status cards inside the header zone. Default breakpoints
 * keep panels legible across widths while aligning with Tailwind's responsive steps.
 */
export function CockpitTelemetryRail({
  children,
  className,
  ...props
}: DivProps) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
