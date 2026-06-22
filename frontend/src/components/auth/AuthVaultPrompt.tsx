import { motion } from 'framer-motion'
import { ArrowRight, BellRing, Lock, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'

const PRIVACY_SIGNALS = [
  'Magic-link access',
  'Account-scoped vault',
  'Saved evidence receipts',
  'Return alerts and removals',
]

export function AuthVaultPrompt({
  title = 'Sign in or create your private vault',
  body = 'Privacy only becomes durable when the evidence is sealed to your account. Until then, results stay browser-local and can disappear when the session ends.',
  compact = false,
  className,
  ctaLabel = 'Sign in or create vault',
  tone = 'alert',
}: {
  title?: string
  body?: string
  compact?: boolean
  className?: string
  ctaLabel?: string
  tone?: 'alert' | 'neutral'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'relative overflow-hidden rounded-[24px] border',
        tone === 'neutral'
          ? 'border-white/10 bg-[linear-gradient(145deg,rgba(20,21,24,0.96),rgba(7,8,10,0.96))] shadow-[0_18px_50px_rgba(0,0,0,0.28)]'
          : 'border-red-500/35 bg-[linear-gradient(145deg,rgba(80,8,14,0.86),rgba(10,10,12,0.94))] shadow-[0_0_40px_rgba(186,24,27,0.14)]',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className
      )}
    >
      <div className={clsx(
        'pointer-events-none absolute inset-0',
        tone === 'neutral'
          ? 'bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.055),transparent_15rem),radial-gradient(circle_at_84%_18%,rgba(212,175,55,0.1),transparent_14rem)]'
          : 'bg-[radial-gradient(circle_at_18%_24%,rgba(186,24,27,0.28),transparent_15rem),radial-gradient(circle_at_84%_18%,rgba(212,175,55,0.16),transparent_14rem)]'
      )} />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className={clsx(
            'relative mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/55 text-[#f5d7a1]',
            tone === 'neutral' ? 'border border-[#d4af37]/30' : 'border border-red-400/45'
          )}>
            <motion.span
              aria-hidden
              className={clsx('absolute inset-0 rounded-full border', tone === 'neutral' ? 'border-[#d4af37]/35' : 'border-red-400/45')}
              animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-1 rounded-full border border-[#d4af37]/30"
              animate={{ scale: [1, 1.22], opacity: [0.45, 0] }}
              transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity, delay: 0.35 }}
            />
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#f5d7a1]">Privacy lock</div>
            <h3 className={clsx('mt-1 font-black text-white', compact ? 'text-lg' : 'text-2xl')}>{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">{body}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          <Link
            to="/account"
            className={clsx(
              'inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold text-[#fff7e8] transition-colors hover:text-white',
              tone === 'neutral'
                ? 'border-[#d4af37]/30 bg-[linear-gradient(180deg,rgba(212,175,55,0.14),rgba(20,21,24,0.94))] hover:border-[#d4af37]/55'
                : 'red-button-glow border-red-400/55 bg-[linear-gradient(180deg,rgba(186,24,27,0.42),rgba(60,5,9,0.92))] hover:border-[#d4af37]/45'
            )}
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex flex-wrap gap-2">
            {PRIVACY_SIGNALS.map(signal => (
              <span
                key={signal}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300"
              >
                {signal === 'Return alerts and removals' ? <BellRing className="h-3 w-3 text-red-300" /> : <ShieldCheck className="h-3 w-3 text-[#f5d7a1]" />}
                {signal}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
