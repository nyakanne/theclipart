import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
if (!SUPABASE_URL) throw new Error('SUPABASE_URL must be set')

export function db() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set')
  return createClient(SUPABASE_URL, key)
}

export function dbPublic() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('SUPABASE_PUBLISHABLE_KEY must be set')
  return createClient(SUPABASE_URL, key)
}
