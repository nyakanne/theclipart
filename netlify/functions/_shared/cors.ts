export const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  process.env.FRONTEND_URL ?? '*',
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
