import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from '@/components/Layout/Navbar'
import { Footer } from '@/components/Layout/Footer'
import { Home } from '@/pages/Home'

const ScanPage = lazy(() => import('@/pages/ScanPage').then(module => ({ default: module.ScanPage })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then(module => ({ default: module.Dashboard })))
const Account = lazy(() => import('@/pages/Account').then(module => ({ default: module.Account })))
const LegalPage = lazy(() => import('@/pages/LegalPage').then(module => ({ default: module.LegalPage })))
// @ts-expect-error Phase1Status is a standalone JSX audit artifact.
const Phase1Status = lazy(() => import('@/pages/Phase1Status'))

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
    },
  },
})

function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-red-400">404 / Route not found</p>
      <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">This page is outside the signal.</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400">
        The address may be outdated. Return to the command center to start a scan or open your saved vault.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link className="rounded border border-red-500 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500" to="/#scan">
          Start a scan
        </Link>
        <Link className="rounded border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 hover:border-gray-500" to="/dashboard">
          Open dashboard
        </Link>
      </div>
    </section>
  )
}

function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="font-mono text-xs uppercase tracking-[0.24em] text-gray-500">Loading secure workspace...</div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex min-h-screen flex-col bg-[#08080d]">
          <Navbar />
          <main className="flex-1">
            <Suspense fallback={<PageLoading />}>
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
