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
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm shadow-slate-200/60 transition focus:border-cockpit-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent/50 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50',
    'dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:shadow-inner dark:shadow-black/20 dark:focus:border-white/40 dark:focus-visible:ring-white/40 dark:placeholder:text-slate-500',
    fullWidth ? 'w-full' : 'w-auto',
    className
  )

  return <input className={classes} style={style} {...props} />
}
