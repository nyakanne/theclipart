/**
 * Netlify Function — all /api/v1/scans/* routes
 *
 * POST /api/v1/scans              → create scan, kick off HIBP check
 * GET  /api/v1/scans              → list user's scans
 * GET  /api/v1/scans/:id/status  → poll status
 * GET  /api/v1/scans/:id         → full result
 * POST /api/v1/scans/:id/opt-out/all → queue opt-outs
 * POST /api/v1/scans/:id/report  → generate report URL
 */
import type { Handler, HandlerEvent } from '@netlify/functions'
import { db } from './_shared/db.js'
import { verifyToken, extractToken } from './_shared/jwt.js'
import { options, json, err } from './_shared/cors.js'

const HIBP_BASE = 'https://haveibeenpwned.com/api/v3'

async function requireUser(event: HandlerEvent): Promise<string | null> {
  const token = extractToken(event.headers.authorization)
  if (!token) return null
  try {
    const p = await verifyToken(token)
    return p.sub
  } catch { return null }
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, '')
}

async function runHibp(email: string): Promise<unknown[]> {
  const key = process.env.HIBP_API_KEY
  if (!key) return []
  const res = await fetch(`${HIBP_BASE}/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
    headers: { 'hibp-api-key': key, 'user-agent': 'DataGuard/1.0' },
  })
  if (res.status === 404) return []
  if (!res.ok) return []
  const data = await res.json() as Array<{
    Name: string; BreachDate?: string; DataClasses: string[]; PwnCount?: number
    Description: string; IsVerified?: boolean
  }>
  const SEV: Record<string, string> = {
    Passwords: 'critical', 'Credit card numbers': 'critical',
    'Email addresses': 'high', 'Phone numbers': 'high',
    'Physical addresses': 'medium', Names: 'low',
  }
  const today = new Date().toISOString().slice(0, 10)
  return data.map(b => {
    const sev = b.DataClasses.reduce<string>((acc, f) => {
      const s = SEV[f] ?? 'low'
      const order = ['critical','high','medium','low']
      return order.indexOf(s) < order.indexOf(acc) ? s : acc
    }, 'low')
    return {
      id: randomId(), source: b.Name, source_type: 'breach_db',
      breach_date: b.BreachDate ?? null, discovered_date: today,
      severity: sev, exposed_fields: b.DataClasses,
      record_count: b.PwnCount ?? null, description: b.Description,
      verified: b.IsVerified ?? false,
    }
  })
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options()

  const userId = await requireUser(event)
  if (!userId) return err('Not authenticated', 401)

  const supabase = db()

  // Strip function path prefix to get the logical path
  const raw = event.path
    .replace(/^\/api\/v1/, '')
    .replace(/^\/\.netlify\/functions\/scans/, '')
    || '/'

  // POST /scans — create new scan
  if (event.httpMethod === 'POST' && (raw === '/' || raw === '')) {
    let body: Record<string, string>
    try { body = JSON.parse(event.body ?? '{}') } catch { return err('Invalid JSON') }

    const { email, phone, username, full_name, notify_email } = body
    if (!email && !phone && !username && !full_name) {
      return err('Provide at least one identifier')
    }

    const scanId = randomId()

    // Insert scan record immediately
    await supabase.from('scans').insert({
      id: scanId, user_id: userId, status: 'scanning',
      progress: 5, current_stage: 'breach_db — checking HIBP',
      risk_score: 0, total_exposures: 0,
    })

    // Run HIBP synchronously (fast — just HTTP)
    const breaches = email ? await runHibp(email) : []

    // Build broker listings placeholder (Playwright runs separately)
    const brokerListings: unknown[] = []

    // Score compliance
    const riskScore = breaches.length > 0
      ? Math.min(100, breaches.length * 15 + (breaches as Array<{ severity: string }>).filter(b => b.severity === 'critical').length * 20)
      : 0

    const violations = []
    const recommendations = []

    if (breaches.length > 0) {
      recommendations.push('Change passwords on all accounts — rotate any reused credentials.')
      recommendations.push('Enable two-factor authentication on your email and banking accounts.')
    }

    const compliance = {
      overall: Math.max(0, 100 - riskScore),
      gdpr_score: Math.max(0, 100 - riskScore),
      ccpa_score: Math.max(0, 100 - Math.floor(riskScore * 0.8)),
      risk_level: riskScore >= 75 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 15 ? 'medium' : 'low',
      violations,
      recommendations,
    }

    // Update scan with results
    await supabase.from('scans').update({
      status: 'completed', progress: 100,
      current_stage: 'complete',
      risk_score: riskScore,
      total_exposures: breaches.length,
      completed_at: new Date().toISOString(),
      result_json: JSON.stringify({ breaches, broker_listings: brokerListings, compliance }),
    }).eq('id', scanId)

    return json({ scan_id: scanId, status: 'scanning', progress: 5, current_stage: 'breach_db — checking HIBP', created_at: new Date().toISOString() }, 201)
  }

  // GET /scans — list
  if (event.httpMethod === 'GET' && (raw === '/' || raw === '')) {
    const { data } = await supabase
      .from('scans')
      .select('id, status, progress, current_stage, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    return json((data ?? []).map((s: Record<string, unknown>) => ({
      scan_id: s.id, status: s.status, progress: s.progress,
      current_stage: s.current_stage, created_at: s.created_at,
    })))
  }

  // Extract scan id from path
  const parts = raw.replace(/^\//, '').split('/')
  const scanId = parts[0]

  if (!scanId) return err('Not found', 404)

  // Verify ownership
  const { data: scan } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!scan) return err('Scan not found', 404)

  const subPath = '/' + parts.slice(1).join('/')

  // GET /scans/:id/status
  if (event.httpMethod === 'GET' && subPath === '/status') {
    return json({
      scan_id: scan.id, status: scan.status, progress: scan.progress,
      current_stage: scan.current_stage, created_at: scan.created_at,
    })
  }

  // GET /scans/:id — full result
  if (event.httpMethod === 'GET' && subPath === '/') {
    let result = { breaches: [], broker_listings: [], compliance: null }
    try { result = JSON.parse(scan.result_json ?? '{}') } catch {}
    return json({
      scan_id: scan.id, status: scan.status,
      created_at: scan.created_at, completed_at: scan.completed_at,
      breaches: result.breaches ?? [],
      broker_listings: result.broker_listings ?? [],
      honey_token_hits: [],
      compliance: result.compliance ?? null,
      total_exposures: scan.total_exposures,
      risk_score: scan.risk_score,
    })
  }

  // POST /scans/:id/opt-out/all
  if (event.httpMethod === 'POST' && subPath === '/opt-out/all') {
    return json({ queued: 0, message: 'Opt-out workers not yet configured. Set up Playwright workers.' })
  }

  // POST /scans/:id/report
  if (event.httpMethod === 'POST' && subPath === '/report') {
    const now = new Date()
    return json({
      scan_id: scanId,
      generated_at: now.toISOString(),
      download_url: `data:text/plain,Scan ${scanId} — ${scan.total_exposures} exposures — risk ${scan.risk_score}`,
      format: 'json',
      includes_dsar: false,
      includes_compliance: true,
      expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
    })
  }

  return err('Not found', 404)
}
