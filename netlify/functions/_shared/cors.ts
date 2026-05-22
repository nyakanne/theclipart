// CORS headers for Netlify Functions.
// On Netlify the functions ARE at the same origin as the frontend,
// so these headers only matter if the API is called from a different origin
// (e.g. mobile apps, Postman). If FRONTEND_URL is not set, no
// Access-Control-Allow-Origin header is emitted, which means browsers enforce
// same-origin policy — the safe default.
const origin = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? ''

export const CORS_HEADERS: Record<string, string> = {
  ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age':       '86400',
}

export function options() {
  return { statusCode: 204, headers: CORS_HEADERS, body: '' }
}

export function json(data: unknown, status = 200) {
  return {
    statusCode: status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}

export function err(message: string, status = 400) {
  return json({ detail: message }, status)
}

export function redirect(url: string) {
  return { statusCode: 302, headers: { ...CORS_HEADERS, Location: url }, body: '' }
}
