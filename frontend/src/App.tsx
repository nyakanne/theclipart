import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from '@/components/Layout/Navbar'
import { Home } from '@/pages/Home'
import { ScanPage } from '@/pages/ScanPage'
import { Dashboard } from '@/pages/Dashboard'
import { Account } from '@/pages/Account'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#08080d]">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/lookup" element={<Home initialTab="find" />} />
              <Route path="/opt-out" element={<Home initialTab="optout" />} />
              <Route path="/image-search" element={<Home initialTab="image" />} />
              <Route path="/reports" element={<Home initialTab="authority" />} />
              <Route path="/account" element={<Account />} />
              <Route path="/scan/:scanId" element={<ScanPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
