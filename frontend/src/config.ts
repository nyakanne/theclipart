/**
 * Runtime config pulled from Vite env vars.
 * Set these in Netlify UI → Site settings → Environment variables.
 *
 * VITE_API_URL   — full URL of the deployed backend, e.g. https://api.dataguard.app
 *                  Leave blank for local dev (Vite proxies /api → localhost:8000)
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  appEnv: import.meta.env.MODE,
}
