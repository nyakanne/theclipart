import { useEffect, useState } from 'react'
import { getSupabaseSession, supabase } from '@/services/supabase'

export function useAuthSession() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let mounted = true

    void getSupabaseSession().then(session => {
      if (!mounted) return
      setSessionEmail(session?.user.email ?? null)
      setResolved(true)
    })

    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null)
      setResolved(true)
    })

    return () => {
      mounted = false
      subscription?.data.subscription.unsubscribe()
    }
  }, [])

  return {
    isAuthenticated: Boolean(sessionEmail),
    isConfigured: Boolean(supabase),
    isReady: resolved,
    sessionEmail,
  }
}
