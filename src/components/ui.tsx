import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-105 active:brightness-95',
  secondary: 'bg-surface-2 text-fg hover:brightness-[0.98] active:brightness-95',
  ghost: 'text-accent-strong hover:bg-accent-soft',
  danger: 'text-danger hover:bg-surface-2',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-medium transition disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block size-5 animate-spin rounded-full border-2 border-border border-t-accent-strong ${className}`}
    />
  )
}

export function CenteredSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Spinner />
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : String(error)
  return <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-danger">{message}</p>
}

/** Top bar for pushed screens (detail, form, settings). */
export function ScreenHeader({ title, right }: { title?: string; right?: ReactNode }) {
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-2xl items-center gap-2 px-3 py-1.5">
        <button
          type="button"
          onClick={goBack}
          className="flex size-11 items-center justify-center rounded-full text-accent-strong hover:bg-accent-soft"
          aria-label="Back"
        >
          <ChevronLeftIcon />
        </button>
        <h1 className="flex-1 truncate text-[17px] font-semibold">{title}</h1>
        <div className="flex items-center gap-1 pr-1">{right}</div>
      </div>
    </header>
  )
}

export function TagChip({
  name,
  selected = false,
  onClick,
}: {
  name: string
  selected?: boolean
  onClick?: () => void
}) {
  const classes = `inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
    selected ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted'
  }`
  if (!onClick) return <span className={classes}>{name}</span>
  return (
    <button type="button" onClick={onClick} className={`${classes} min-h-9`} aria-pressed={selected}>
      {name}
    </button>
  )
}
