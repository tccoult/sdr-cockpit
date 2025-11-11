import { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  fullWidth?: boolean
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-slate-900 text-white hover:bg-slate-800 dark:border-white/30 dark:bg-cockpit-accent/40 dark:hover:bg-cockpit-accent/50',
  secondary:
    'border-border bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  subtle:
    'border-border/60 bg-muted text-muted-foreground hover:bg-muted/80',
  ghost:
    'border-transparent bg-transparent text-foreground hover:bg-ghost hover:text-foreground',
  icon:
    'rounded-md border-border/70 bg-card p-0 text-muted-foreground hover:bg-muted/70 hover:text-foreground',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
}

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  fullWidth = false,
  className,
  style,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = cn(
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    variant === 'icon' ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size],
    fullWidth && 'w-full',
    className
  )

  return (
    <button type={type} className={classes} style={style} {...props}>
      {children}
    </button>
  )
}
