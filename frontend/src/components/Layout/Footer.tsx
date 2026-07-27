import { Link } from 'react-router-dom'
import { ArrowUpRight, ShieldAlert } from 'lucide-react'

const productLinks = [
  ['Scan yourself', '/scan-yourself'],
  ['Find yourself', '/lookup'],
  ['OSINT tools', '/osint'],
  ['Image search', '/image-search'],
] as const

const trustLinks = [
  ['Privacy policy', '/privacy'],
  ['Terms of use', '/terms'],
  ['Account & vault', '/account'],
  ['Dashboard', '/dashboard'],
] as const

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div className="max-w-xl">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-gold-500/25 bg-black text-gold-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-black text-white">Vindica</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">Detect. Remove. Defend.</div>
            </div>
          </Link>
          <p className="mt-4 text-sm leading-7 text-gray-500">
            Privacy-defense software for finding exposed personal data, preserving source-backed evidence, and organizing removal or reporting actions.
          </p>
          <p className="mt-4 text-xs leading-6 text-gray-600">
            Vindica is not a law firm, credit bureau, or law-enforcement agency. Results require review and should not be treated as proof of identity or wrongdoing.
          </p>
        </div>

        <FooterLinks title="Product" links={productLinks} />
        <FooterLinks title="Trust & access" links={trustLinks} />
      </div>
      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-gray-600 sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Vindica. Privacy restored with evidence, not guesswork.</span>
          <a href="mailto:privacy@vindica.me" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
            privacy@vindica.me
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}

function FooterLinks({
  title,
  links,
}: {
  title: string
  links: ReadonlyArray<readonly [string, string]>
}) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-400">{title}</h2>
      <div className="mt-4 grid gap-3">
        {links.map(([label, href]) => (
          <Link key={href} to={href} className="text-sm text-gray-400 transition-colors hover:text-white">
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
