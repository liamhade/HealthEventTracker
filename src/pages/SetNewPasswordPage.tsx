import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { PASSWORD_MIN } from '../lib/username'
import { useAuth } from '../hooks/auth'
import { Button, ErrorNote, Spinner } from '../components/ui'

const inputClass =
  'w-full min-h-12 rounded-xl border border-border bg-bg px-3 outline-none focus:border-accent-strong'

/** Shown after opening a password-reset link, before the rest of the app. */
export function SetNewPasswordPage() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < PASSWORD_MIN) return setError(new Error(`Use at least ${PASSWORD_MIN} characters.`))
    if (password !== confirm) return setError(new Error("The passwords don't match."))
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error)
    finishRecovery()
  }

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-[26px] font-bold tracking-tight">Choose a new password</h1>
        <p className="text-[15px] text-muted">You'll use it with your username from now on.</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="w-full max-w-xs space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          className={inputClass}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          className={inputClass}
        />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner /> : 'Save password'}
        </Button>
        <ErrorNote error={error} />
      </form>
    </div>
  )
}
