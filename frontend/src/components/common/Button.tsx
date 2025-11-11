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
  'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-cockpit-accent/90 text-white shadow-sm hover:bg-cockpit-accent/80 dark:bg-cockpit-accent/60 dark:hover:bg-cockpit-accent/70',
  secondary:
    'border-border/70 bg-card/90 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:bg-card/80 dark:border-border/60 dark:bg-card/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  subtle:
    'border-border/60 bg-muted/80 text-muted-foreground hover:bg-muted/70 dark:border-border/50 dark:bg-muted/30 dark:hover:bg-muted/40',
  ghost:
    'border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-muted/20',
  icon:
    'rounded-md border-border/70 bg-card/80 p-0 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-card/70 hover:text-foreground dark:border-border/60 dark:bg-card/30 dark:shadow-none dark:hover:bg-card/40',
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
