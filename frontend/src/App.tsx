import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { ExposureDashboard } from '@/pages/ExposureDashboard'
import { RemovalsPage } from '@/pages/RemovalsPage'
import { Dashboard } from '@/pages/Dashboard'
import { ScanPage } from '@/pages/ScanPage'
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

          {/* Protected */}
          <Route path="/exposure" element={<ProtectedRoute><ExposureDashboard /></ProtectedRoute>} />
          <Route path="/removals" element={<ProtectedRoute><RemovalsPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scan/:scanId" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
