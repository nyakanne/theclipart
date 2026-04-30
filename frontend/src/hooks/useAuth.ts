import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'

export function useAuth() {
  const { token, user, setUser, logout, isAuthenticated } = useAuthStore()

  const { data, error } = useQuery({
    queryKey: ['me', token],
    queryFn: () => api.auth.me(),
    enabled: !!token && !user,
    retry: false,
  })

  useEffect(() => {
    if (data) setUser(data)
  }, [data, setUser])

  useEffect(() => {
    if (error) logout()
  }, [error, logout])

  return { token, user: user ?? data ?? null, isAuthenticated, logout }
}

export function useRequireAuth() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated()) navigate('/login', { replace: true })
  }, [isAuthenticated, navigate])
}
