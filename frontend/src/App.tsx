import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from '@/components/Layout/Navbar'
import { Home } from '@/pages/Home'
import { ScanPage } from '@/pages/ScanPage'
import { Dashboard } from '@/pages/Dashboard'
import { CommandCenter } from '@/pages/CommandCenter'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
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
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected — wrap all app routes in a layout with Navbar */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-950">
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/scan/:scanId" element={<ScanPage />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/command-center" element={<CommandCenter />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
