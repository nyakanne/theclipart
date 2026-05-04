/**
 * Centralised API client.
 * In dev: proxied through Vite → http://localhost:7331
 * In prod: VITE_API_URL points to Railway/Render backend
 */

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function apiUrl(path: string) {
  return `${BASE}${path}`
}

/** Convert http(s):// → ws(s):// for the SSE/WS base */
export function sseUrl(huntId: string) {
  return apiUrl(`/api/hunts/${huntId}/stream`)
}

export async function startHunt(target: string, mode: string, minBounty: number) {
  const res = await fetch(apiUrl('/api/hunts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, mode, min_bounty: minBounty }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ hunt_id: string; status: string }>
}

export async function listHunts() {
  const res = await fetch(apiUrl('/api/hunts'))
  return res.json()
}

export async function getHunt(huntId: string) {
  const res = await fetch(apiUrl(`/api/hunts/${huntId}`))
  return res.json()
}

export async function stopHunt(huntId: string) {
  const res = await fetch(apiUrl(`/api/hunts/${huntId}`), { method: 'DELETE' })
  return res.json()
}

/** Open an SSE stream for live hunt events */
export function openEventStream(
  huntId: string,
  onEvent: (event: Record<string, unknown>) => void,
  onError?: () => void,
): EventSource {
  const es = new EventSource(sseUrl(huntId))
  es.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)) } catch { /* skip malformed */ }
  }
  es.onerror = () => {
    onError?.()
    es.close()
  }
  return es
}
