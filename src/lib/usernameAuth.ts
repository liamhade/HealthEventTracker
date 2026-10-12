import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { normalizeUsername } from './username'

// Calls the username-auth Edge Function (supabase/functions/username-auth).

async function errorCode(error: unknown): Promise<string | undefined> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      return body?.error
    } catch {
      return undefined
    }
  }
  return undefined
}

export async function signInWithUsername(username: string, password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{
    session: { access_token: string; refresh_token: string }
  }>('username-auth', { body: { action: 'sign-in', username: normalizeUsername(username), password } })

  if (error || !data?.session) {
    const code = await errorCode(error)
    if (code === 'rate_limited') throw new Error('Too many attempts. Wait a minute and try again.')
    if (code === 'invalid_credentials') throw new Error('Wrong username or password.')
    throw new Error("Couldn't reach the sign-in service. Try again.")
  }

  const { error: sessionError } = await supabase.auth.setSession(data.session)
  if (sessionError) throw sessionError
}

export async function requestPasswordReset(username: string): Promise<void> {
  const { error } = await supabase.functions.invoke('username-auth', {
    body: { action: 'reset', username: normalizeUsername(username), redirectTo: window.location.origin },
  })
  if (error) throw new Error("Couldn't send the reset request. Try again.")
}
