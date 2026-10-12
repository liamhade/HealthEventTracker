import { useState } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Button, ErrorNote, Spinner } from '../components/ui'

const providers = (import.meta.env.VITE_AUTH_PROVIDERS ?? 'google')
  .split(',')
  .map((p: string) => p.trim())
  .filter(Boolean) as Provider[]

const providerLabel = (p: string) => (p === 'github' ? 'GitHub' : p.charAt(0).toUpperCase() + p.slice(1))

export function LoginPage() {
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<unknown>(null)

  const signIn = async (provider: Provider) => {
    setPending(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error)
      setPending(null)
    }
  }

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-soft">
          <svg viewBox="0 0 24 24" width={30} height={30} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
          </svg>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">Health Event Tracker</h1>
        <p className="text-[15px] text-muted">Log what happens, see it over time.</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {providers.map((p) => (
          <Button key={p} onClick={() => signIn(p)} disabled={pending !== null} className="w-full">
            {pending === p ? <Spinner /> : `Continue with ${providerLabel(p)}`}
          </Button>
        ))}
        <ErrorNote error={error} />
      </div>
    </div>
  )
}
