import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { recoveryRedirect, supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  loading: boolean
  /** Signed in through a password-reset link; a new password must be chosen first. */
  recovering: boolean
  /** A reset link that failed (expired, already used). */
  recoveryError: string | null
  finishRecovery: () => void
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  recovering: false,
  recoveryError: null,
  finishRecovery: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(recoveryRedirect?.kind === 'tokens')
  const [recoveryError, setRecoveryError] = useState(
    recoveryRedirect?.kind === 'error' ? recoveryRedirect.message : null,
  )

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (recoveryRedirect?.kind === 'tokens') {
        const { error } = await supabase.auth.setSession(recoveryRedirect)
        if (error && !cancelled) {
          setRecovering(false)
          setRecoveryError('This reset link is invalid or has expired. Request a new one.')
        }
      }
      const { data } = await supabase.auth.getSession()
      if (!cancelled) {
        setSession(data.session)
        setLoading(false)
      }
    }
    init()
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const value: AuthState = {
    session,
    loading,
    recovering: recovering && !!session,
    recoveryError,
    finishRecovery: () => setRecovering(false),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

/** For screens rendered behind the auth gate, where a user is guaranteed. */
export function useUser(): User {
  const { session } = useAuth()
  if (!session) throw new Error('useUser called without a session')
  return session.user
}
