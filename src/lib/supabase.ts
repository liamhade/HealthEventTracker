import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.')
}

export type RecoveryRedirect =
  | { kind: 'tokens'; access_token: string; refresh_token: string }
  | { kind: 'error'; message: string }

/**
 * Password-reset links are issued by the username-auth Edge Function with the implicit flow, so
 * they land with tokens in the URL hash. This client uses PKCE and would reject that URL, so take
 * the hash before the client is created and strip it from the address bar.
 */
function takeRecoveryRedirect(): RecoveryRedirect | null {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const isRecovery = params.get('type') === 'recovery'
  const error = params.get('error_description')
  if (!isRecovery && !error) return null

  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  if (error) return { kind: 'error', message: error.replace(/\+/g, ' ') }
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  return access_token && refresh_token ? { kind: 'tokens', access_token, refresh_token } : null
}

export const recoveryRedirect = takeRecoveryRedirect()

export const supabase = createClient<Database>(url, key, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const IMAGE_BUCKET = 'event-images'
