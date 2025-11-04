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
    'rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-black/20 transition focus:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50',
    fullWidth ? 'w-full' : 'w-auto',
    className
  )

  return <input className={classes} style={style} {...props} />
}
