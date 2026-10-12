import { useState, type FormEvent } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { requestPasswordReset, signInWithUsername } from '../lib/usernameAuth'
import { useAuth } from '../hooks/auth'
import { PASSWORD_MIN, normalizeUsername, usernameToEmail, validateUsername } from '../lib/username'
import { Button, ErrorNote, Spinner } from '../components/ui'

const providers = (import.meta.env.VITE_AUTH_PROVIDERS ?? 'google')
  .split(',')
  .map((p: string) => p.trim())
  .filter(Boolean) as Provider[]

const providerLabel = (p: string) => (p === 'github' ? 'GitHub' : p.charAt(0).toUpperCase() + p.slice(1))

type Mode = 'sign-in' | 'sign-up' | 'reset'

const inputClass = 'w-full min-h-12 rounded-xl border border-border bg-bg px-4 outline-none focus:border-accent-strong'

function friendlyAuthError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Wrong username or password.'
    case 'user_already_exists':
    case 'email_exists':
      return 'That username is taken. Pick another one.'
    case 'unexpected_failure':
      // The profiles trigger rejects a username another account already holds.
      return /saving new user/i.test(error.message) ? 'That username is taken. Pick another one.' : error.message
    case 'weak_password':
      return `Choose a stronger password (at least ${PASSWORD_MIN} characters).`
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Wait a minute and try again.'
    default:
      return error.message
  }
}

export function LoginPage() {
  const { recoveryError } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [oauthPending, setOauthPending] = useState<Provider | null>(null)
  const [error, setError] = useState<unknown>(recoveryError ? new Error(recoveryError) : null)
  const [notice, setNotice] = useState<string | null>(null)

  const isSignUp = mode === 'sign-up'
  const isReset = mode === 'reset'

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (isReset) {
      if (!username.trim()) return setError(new Error('Enter your username.'))
      setBusy(true)
      try {
        await requestPasswordReset(username)
        setNotice(
          'If that account has a recovery email, a reset link is on its way. Check your inbox (and spam folder).',
        )
      } catch (err) {
        setError(err)
      } finally {
        setBusy(false)
      }
      return
    }

    if (isSignUp) {
      const invalid = validateUsername(username)
      if (invalid) return setError(new Error(invalid))
      if (password.length < PASSWORD_MIN) {
        return setError(new Error(`Password must be at least ${PASSWORD_MIN} characters.`))
      }
    } else if (!username.trim() || !password) {
      return setError(new Error('Enter your username and password.'))
    }

    setBusy(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: usernameToEmail(username),
          password,
          options: { data: { username: normalizeUsername(username) } },
        })
        if (error) throw new Error(friendlyAuthError(error))
        // With email confirmation enabled no session comes back, and a username has no inbox.
        if (!data.session) {
          throw new Error(
            'Account created, but sign-in is blocked: turn off "Confirm email" in the Supabase Auth email settings.',
          )
        }
        // AuthProvider picks up the new session and swaps this screen out.
      } else {
        await signInWithUsername(username, password)
      }
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  const signInWithProvider = async (provider: Provider) => {
    setOauthPending(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error)
      setOauthPending(null)
    }
  }

  const disabled = busy || oauthPending !== null

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-soft">
          <svg
            viewBox="0 0 24 24"
            width={30}
            height={30}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
          </svg>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">Health Event Tracker</h1>
        <p className="text-[15px] text-muted">Log what happens, see it over time.</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
          {(['sign-in', 'sign-up'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m || (m === 'sign-in' && isReset)}
              onClick={() => switchMode(m)}
              className={`min-h-11 rounded-lg text-[14px] font-medium transition ${
                mode === m || (m === 'sign-in' && isReset) ? 'bg-bg text-fg shadow-soft' : 'text-muted'
              }`}
            >
              {m === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            className={inputClass}
          />
          {isReset && (
            <p className="text-[13px] text-muted">
              Enter your username. If your account has a recovery email, we'll send a link to choose a new password.
            </p>
          )}
          {!isReset && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className={inputClass}
            />
          )}
          {isSignUp && (
            <p className="text-[13px] text-muted">
              Letters, numbers, dots, dashes and underscores. Password: {PASSWORD_MIN}+ characters. Add a recovery email
              in Settings afterwards so you can reset a forgotten password.
            </p>
          )}
          <Button type="submit" disabled={disabled} className="w-full">
            {busy ? <Spinner /> : isReset ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'}
          </Button>
          {mode === 'sign-in' && (
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="w-full py-2 text-[14px] text-accent-strong"
            >
              Forgot password?
            </button>
          )}
          {isReset && (
            <button
              type="button"
              onClick={() => switchMode('sign-in')}
              className="w-full py-2 text-[14px] text-accent-strong"
            >
              Back to sign in
            </button>
          )}
        </form>

        {notice && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">{notice}</p>}

        <ErrorNote error={error} />

        {providers.length > 0 && (
          <>
            <div className="flex items-center gap-3 text-[13px] text-muted">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-3">
              {providers.map((p) => (
                <Button
                  key={p}
                  variant="secondary"
                  onClick={() => signInWithProvider(p)}
                  disabled={disabled}
                  className="w-full"
                >
                  {oauthPending === p ? <Spinner /> : `Continue with ${providerLabel(p)}`}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
