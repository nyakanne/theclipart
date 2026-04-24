/**
 * Netlify Function — all /api/v1/auth/* routes
 *
 * GET  /api/v1/auth/google           → redirect to Google consent screen
 * GET  /api/v1/auth/google/callback  → exchange code, upsert user, redirect with JWT
 * GET  /api/v1/auth/me               → return current user (requires JWT)
 */
import type { Handler, HandlerEvent } from '@netlify/functions'
import { db } from './_shared/db.js'
import { signToken, verifyToken, extractToken } from './_shared/jwt.js'
import { options, json, err, redirect } from './_shared/cors.js'

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USER_URL  = 'https://www.googleapis.com/oauth2/v3/userinfo'

function callbackUri(event: HandlerEvent): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI
  const proto = event.headers['x-forwarded-proto'] ?? 'https'
  const host  = event.headers.host ?? ''
  return `${proto}://${host}/.netlify/functions/auth/google/callback`
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options()

  const path = event.path.replace(/^\/api\/v1\/auth/, '').replace(/^\/\.netlify\/functions\/auth/, '')

  // ── GET /google ──────────────────────────────────────────────────────────
  if (path === '/google' || path === '' && event.queryStringParameters?.action === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return err('GOOGLE_CLIENT_ID not configured', 500)

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  callbackUri(event),
      response_type: 'code',
      scope:         'openid email profile',
      access_type:   'offline',
      prompt:        'select_account',
    })
    return redirect(`${GOOGLE_AUTH_URL}?${params}`)
  }

  // ── GET /google/callback ─────────────────────────────────────────────────
  if (path === '/google/callback') {
    const code = event.queryStringParameters?.code
    if (!code) return err('Missing OAuth code')

    const clientId     = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) return err('Google OAuth not configured', 500)

    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  callbackUri(event),
        grant_type:    'authorization_code',
      }),
    })
    if (!tokenRes.ok) return err(`Google token exchange failed: ${await tokenRes.text()}`, 502)
    const tokens = await tokenRes.json() as { access_token: string }

    // Fetch user profile
    const infoRes = await fetch(GOOGLE_USER_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!infoRes.ok) return err('Failed to fetch Google profile', 502)
    const info = await infoRes.json() as {
      sub: string; email: string; name: string; picture?: string
    }

    // Upsert user in Supabase
    const supabase = db()
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('google_sub', info.sub)
      .maybeSingle()

    let userId: string
    if (existing) {
      userId = existing.id
      await supabase.from('users').update({
        name: info.name, picture: info.picture ?? null, last_login: new Date().toISOString(),
      }).eq('id', userId)
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ google_sub: info.sub, email: info.email, name: info.name, picture: info.picture ?? null })
        .select('id')
        .single()
      if (error || !newUser) return err(`DB error: ${error?.message}`, 500)
      userId = newUser.id
    }

    const jwt = await signToken(userId, info.email)
    const frontend = (process.env.FRONTEND_URL ?? '').replace(/\/$/, '')
    return redirect(`${frontend}/auth/callback#token=${jwt}`)
  }

  // ── GET /me ───────────────────────────────────────────────────────────────
  if (path === '/me') {
    const token = extractToken(event.headers.authorization)
    if (!token) return err('Not authenticated', 401)

    let payload: { sub: string; email: string }
    try { payload = await verifyToken(token) }
    catch { return err('Invalid or expired token', 401) }

    const { data: user, error } = await db()
      .from('users')
      .select('id, email, name, picture, created_at')
      .eq('id', payload.sub)
      .single()

    if (error || !user) return err('User not found', 404)
    return json(user)
  }

  return err('Not found', 404)
}
