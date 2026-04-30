/**
 * Netlify Function — /api/v1/auth/*
 *
 * GET /api/v1/auth/github           → redirect to GitHub consent
 * GET /api/v1/auth/github/callback  → exchange code, upsert user, return JWT
 * GET /api/v1/auth/me               → current user (requires Bearer JWT)
 */
import type { Handler, HandlerEvent } from '@netlify/functions'
import { db } from './_shared/db.js'
import { signToken, verifyToken, extractToken } from './_shared/jwt.js'
import { options, json, err, redirect } from './_shared/cors.js'

const GITHUB_AUTH_URL  = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL  = 'https://api.github.com/user'
const GITHUB_EMAIL_URL = 'https://api.github.com/user/emails'

function callbackUri(event: HandlerEvent): string {
  if (process.env.GITHUB_REDIRECT_URI) return process.env.GITHUB_REDIRECT_URI
  const proto = event.headers['x-forwarded-proto'] ?? 'https'
  const host  = event.headers.host ?? ''
  return `${proto}://${host}/api/v1/auth/github/callback`
}

async function ghGet(url: string, token: string) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!r.ok) throw new Error(`GitHub API ${r.status}: ${await r.text()}`)
  return r.json()
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options()

  const path = event.path
    .replace(/^\/api\/v1\/auth/, '')
    .replace(/^\/\.netlify\/functions\/auth/, '')
    .replace(/\/$/, '') || '/'

  // ── GET /github → redirect to GitHub ─────────────────────────────────────
  if (path === '/github') {
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) return err('GITHUB_CLIENT_ID not configured', 500)

    const params = new URLSearchParams({
      client_id:    clientId,
      redirect_uri: callbackUri(event),
      scope:        'read:user user:email',
    })
    return redirect(`${GITHUB_AUTH_URL}?${params}`)
  }

  // ── GET /github/callback ──────────────────────────────────────────────────
  if (path === '/github/callback') {
    const code = event.queryStringParameters?.code
    if (!code) return err('Missing OAuth code')

    const clientId     = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    if (!clientId || !clientSecret) return err('GitHub OAuth not configured', 500)

    // Exchange code → access token
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: callbackUri(event) }),
    })
    if (!tokenRes.ok) return err('GitHub token exchange failed', 502)
    const tokens = await tokenRes.json() as { access_token?: string; error?: string }
    if (!tokens.access_token) return err(tokens.error ?? 'No access token returned', 502)

    const access_token = tokens.access_token

    // Fetch profile + primary email
    const [profile, emails] = await Promise.all([
      ghGet(GITHUB_USER_URL, access_token) as Promise<{ id: number; login: string; name?: string; avatar_url?: string; email?: string }>,
      ghGet(GITHUB_EMAIL_URL, access_token) as Promise<Array<{ email: string; primary: boolean; verified: boolean }>>,
    ])

    const primaryEmail =
      profile.email ??
      emails.find(e => e.primary && e.verified)?.email ??
      emails.find(e => e.verified)?.email ??
      `${profile.login}@users.noreply.github.com`

    const githubSub = `github:${profile.id}`
    const name      = profile.name ?? profile.login

    // Upsert user in Supabase
    const supabase = db()
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('google_sub', githubSub)   // reusing google_sub column as generic oauth_sub
      .maybeSingle()

    let userId: string
    if (existing) {
      userId = existing.id
      await supabase.from('users').update({
        name, picture: profile.avatar_url ?? null, last_login: new Date().toISOString(),
      }).eq('id', userId)
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ google_sub: githubSub, email: primaryEmail, name, picture: profile.avatar_url ?? null })
        .select('id')
        .single()
      if (error || !newUser) return err(`DB error: ${error?.message}`, 500)
      userId = newUser.id
    }

    const jwt = await signToken(userId, primaryEmail)
    const frontend = (process.env.FRONTEND_URL ?? '').replace(/\/$/, '')
    return redirect(`${frontend}/auth/callback#token=${jwt}`)
  }

  // ── GET /me ───────────────────────────────────────────────────────────────
  if (path === '/me') {
    const token = extractToken(event.headers.authorization)
    if (!token) return err('Not authenticated', 401)

    let payload: { sub: string }
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
