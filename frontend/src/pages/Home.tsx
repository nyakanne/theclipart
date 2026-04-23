import { motion } from 'framer-motion'
import { ShieldCheck, Database, Globe, Zap, FileCheck } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { SearchForm } from '@/components/BreachSearch/SearchForm'

const FEATURES = [
  {
    icon: <Database className="h-5 w-5 text-brand-400" />,
    title: 'Broker Scanner',
    desc: '250+ data broker sites scanned via DSAR automation.',
  },
  {
    icon: <Globe className="h-5 w-5 text-orange-400" />,
    title: 'One-Click Purge',
    desc: 'Generates and tracks deletion requests per jurisdiction.',
  },
  {
    icon: <Zap className="h-5 w-5 text-yellow-400" />,
    title: 'Honey-Token Sentinel',
    desc: 'Seeds unique aliases and alerts on illicit resurfacing.',
  },
  {
    icon: <FileCheck className="h-5 w-5 text-green-400" />,
    title: 'Regulator Ready-Pack',
    desc: 'One-click dossier for FTC / DPA filing with SHA-256 hashes.',
  },
]

export function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-900/50 border border-brand-800 mb-6">
          <ShieldCheck className="h-8 w-8 text-brand-400" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Find your data. <span className="text-brand-400">Erase it.</span>
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
          DataGuard scans breach databases, data-broker registries, and dark-web
          sources — then arms you to remove your data and hold brokers accountable.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card>
          <CardBody className="p-6">
            <SearchForm />
          </CardBody>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {FEATURES.map(f => (
          <div key={f.title} className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
            <div className="mb-2">{f.icon}</div>
            <p className="text-sm font-semibold text-gray-200">{f.title}</p>
            <p className="mt-0.5 text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </motion.div>

      <p className="mt-8 text-center text-xs text-gray-600">
        All queries are encrypted at rest (AES-256 / KMS). We never store raw PII beyond the scan window.
        By scanning you accept our <span className="text-gray-500 underline cursor-pointer">Terms</span> and{' '}
        <span className="text-gray-500 underline cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  )
}
