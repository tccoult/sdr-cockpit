import { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'icon'
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
  'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/60 disabled:cursor-not-allowed disabled:opacity-50'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:border-white/30 dark:bg-cockpit-accent/40 dark:hover:bg-cockpit-accent/50 dark:shadow-cockpit-glow/30',
  secondary:
    'border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-white/30 dark:hover:bg-white/15',
  subtle:
    'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/10',
  icon:
    'rounded-full border-slate-300 bg-white p-0 text-slate-600 hover:bg-slate-100 dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-white/30 dark:hover:bg-white/15',
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
