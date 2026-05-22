import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL must be set')
  return url
}

export function db() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set')
  return createClient(getSupabaseUrl(), key)
}

export function dbPublic() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('SUPABASE_PUBLISHABLE_KEY must be set')
  return createClient(getSupabaseUrl(), key)
}
