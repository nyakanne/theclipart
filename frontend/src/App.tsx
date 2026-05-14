import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { Account } from '@/pages/Account'
import { CommandCenter } from '@/pages/CommandCenter'
import { useAuthStore } from '@/store/authStore'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 10_000 } },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/account" element={<Account />} />

          {/* Command center — all feature tabs live here */}
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <CommandCenter />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route path="/exposure"   element={<Navigate to="/app" replace />} />
          <Route path="/removals"   element={<Navigate to="/app" replace />} />
          <Route path="/dashboard"  element={<Navigate to="/app" replace />} />
          <Route path="/lookup"     element={<Navigate to="/app" replace />} />
          <Route path="/track"      element={<Navigate to="/app" replace />} />
          <Route path="/opt-out"    element={<Navigate to="/app" replace />} />
          <Route path="/reports"    element={<Navigate to="/app" replace />} />
          <Route path="/image-search" element={<Navigate to="/app" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
