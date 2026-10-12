// Username-based auth helpers, called before the user has a session.
//
//   { action: "sign-in", username, password }  -> { session: { access_token, refresh_token } }
//   { action: "reset", username, redirectTo }  -> { ok: true }
//
// Accounts may have swapped their synthetic login email for a real recovery email, so the
// username -> email lookup happens here with the service role and the email is never returned.
// Deployed with verify_jwt = false: callers have no session yet, and the password check (or the
// fixed generic response for resets) is the authentication.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const SYNTHETIC_EMAIL = /^u-.+@example\.com$/
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// A fresh public client per request; implicit flow so a reset link carries tokens the browser can
// use directly (a PKCE verifier would be stuck in this function).
const publicClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: 'implicit' },
  })

async function emailForUsername(raw: unknown): Promise<string | null> {
  if (typeof raw !== 'string') return null
  const username = raw.trim().toLowerCase()
  if (!USERNAME.test(username)) return null
  const { data: profile } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
  if (!profile) return null
  const { data } = await admin.auth.admin.getUserById(profile.id)
  return data.user?.email ?? null
}

function isAllowedRedirect(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  if (body.action === 'sign-in') {
    const email = await emailForUsername(body.username)
    if (!email || typeof body.password !== 'string' || !body.password) {
      return json({ error: 'invalid_credentials' }, 400)
    }
    const { data, error } = await publicClient().auth.signInWithPassword({ email, password: body.password })
    if (error || !data.session) {
      const code = error?.code === 'over_request_rate_limit' ? 'rate_limited' : 'invalid_credentials'
      return json({ error: code }, code === 'rate_limited' ? 429 : 400)
    }
    return json({
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    })
  }

  if (body.action === 'reset') {
    if (!isAllowedRedirect(body.redirectTo)) return json({ error: 'bad_request' }, 400)
    const email = await emailForUsername(body.username)
    // Only accounts with a real recovery email can be reset. The response is identical either way
    // so it can't be used to discover usernames or whether they have a recovery email.
    if (email && !SYNTHETIC_EMAIL.test(email)) {
      const { error } = await publicClient().auth.resetPasswordForEmail(email, { redirectTo: body.redirectTo })
      if (error) console.error('reset failed', error.code, error.message)
    }
    return json({ ok: true })
  }

  return json({ error: 'bad_request' }, 400)
})
