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
  'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-white/30 bg-cockpit-accent/40 text-white shadow-sm shadow-black/30 hover:bg-cockpit-accent/50',
  secondary:
    'border-white/20 bg-white/10 text-slate-100 hover:border-white/30 hover:bg-white/15',
  subtle:
    'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10',
  icon:
    'rounded-full border-white/20 bg-white/10 p-0 text-slate-100 hover:border-white/30 hover:bg-white/15',
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
