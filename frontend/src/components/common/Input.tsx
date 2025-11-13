import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export function Input({
  fullWidth = false,
  className,
  style,
  ...props
}: InputProps) {
  const classes = cn(
    'rounded-md border border-border/70 bg-card px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50',
    fullWidth ? 'w-full' : 'w-auto',
    className
  )

  return <input className={classes} style={style} {...props} />
}
