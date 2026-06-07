import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from '@/components/Layout/Navbar'
import { Footer } from '@/components/Layout/Footer'
import { Home } from '@/pages/Home'
import { ScanPage } from '@/pages/ScanPage'
import { Dashboard } from '@/pages/Dashboard'
import { Account } from '@/pages/Account'
import { LegalPage } from '@/pages/LegalPage'
// @ts-expect-error Phase1Status is a standalone JSX audit artifact.
import Phase1Status from '@/pages/Phase1Status'

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
        <div className="flex min-h-screen flex-col bg-[#08080d]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/scan-yourself" element={<Home initialTab="scanSelf" />} />
              <Route path="/lookup" element={<Home initialTab="find" />} />
              <Route path="/osint" element={<Home initialTab="osint" />} />
              <Route path="/opt-out" element={<Home initialTab="optout" />} />
              <Route path="/brokers" element={<Home initialTab="brokers" />} />
              <Route path="/image-search" element={<Home initialTab="image" />} />
              <Route path="/fingerprint" element={<Home initialTab="fingerprint" />} />
              <Route path="/track" element={<Home initialTab="monitor" />} />
              <Route path="/platform-reporter" element={<Home initialTab="platform" />} />
              <Route path="/email-blast" element={<Home initialTab="email" />} />
              <Route path="/reports" element={<Home initialTab="authority" />} />
              <Route path="/account" element={<Account />} />
              <Route path="/scan/:scanId" element={<ScanPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/privacy" element={<LegalPage kind="privacy" />} />
              <Route path="/terms" element={<LegalPage kind="terms" />} />
              <Route path="/internal/phase1" element={<Phase1Status />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
