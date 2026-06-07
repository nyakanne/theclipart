import { motion } from 'framer-motion'
import { ArrowRight, Check, Database, FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react'

const ACTIVATION_STEPS = [
  { icon: LockKeyhole, label: 'Identity link verified' },
  { icon: Database, label: 'Private vault initialized' },
  { icon: FileCheck2, label: 'Evidence workspace ready' },
] as const

export function VaultActivationTransition({
  email,
  onContinue,
}: {
  email: string
  onContinue: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#030305]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="activation-grid pointer-events-none absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 border-l-2 border-[#d4af37] pl-3 text-xs font-black uppercase tracking-[0.2em] text-[#f5d7a1]"
            >
              <ShieldCheck className="h-4 w-4" />
              Vault activation complete
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-6 text-5xl font-black leading-[0.95] text-[#fff7e8] sm:text-7xl"
            >
              Your privacy workspace is ready.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 max-w-xl text-base leading-8 text-gray-400"
            >
              Signed in as <span className="font-semibold text-white">{email}</span>. We’re moving you into the command center where saved scans, evidence, and actions stay account-scoped.
            </motion.p>
            <button
              type="button"
              onClick={onContinue}
              className="mt-8 inline-flex items-center gap-2 border border-red-500/50 bg-red-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-red-500"
            >
              Enter command center
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="activation-console relative min-h-[420px] border border-white/10 bg-black/55 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Secure onboarding sequence</div>
              <div className="font-mono text-xs text-emerald-300">100% READY</div>
            </div>
            <div className="mt-8 grid gap-5">
              {ACTIVATION_STEPS.map(({ icon: Icon, label }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, delay: 0.2 + index * 0.22 }}
                  className="flex items-center gap-4 border-b border-white/8 pb-5"
                >
                  <div className="grid h-11 w-11 place-items-center border border-[#d4af37]/25 bg-[#d4af37]/[0.05] text-[#f5d7a1]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{label}</div>
                    <div className="mt-1 h-1 overflow-hidden bg-white/5">
                      <motion.div
                        className="h-full bg-[linear-gradient(90deg,#ba181b,#d4af37)]"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.7, delay: 0.32 + index * 0.22 }}
                      />
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-emerald-300" />
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.15 }}
              className="mt-8 border border-emerald-500/20 bg-emerald-950/10 px-4 py-3 font-mono text-xs leading-6 text-emerald-200"
            >
              session.status = authenticated<br />
              vault.scope = account<br />
              next.route = /dashboard
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
