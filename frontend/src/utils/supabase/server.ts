// Vite+React equivalent of the Next.js createServerClient pattern.
// Cookie storage is handled via document.cookie (browser) since we have
// no server components — session refresh is done in middleware/interceptors.
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export function createClient() {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return document.cookie.split(';').map((c) => {
          const [name, ...rest] = c.trim().split('=')
          return { name, value: rest.join('=') }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookie = `${name}=${value}`
          if (options?.path)    cookie += `; path=${options.path}`
          if (options?.maxAge)  cookie += `; max-age=${options.maxAge}`
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
          if (options?.secure)  cookie += `; secure`
          document.cookie = cookie
        })
      },
    },
  })
}
