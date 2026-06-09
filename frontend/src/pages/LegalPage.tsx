import { Link } from 'react-router-dom'
import { ArrowLeft, Database, Eye, FileCheck2, LockKeyhole, Scale, ShieldCheck } from 'lucide-react'

type LegalKind = 'privacy' | 'terms'

const privacySections = [
  {
    title: 'Information you provide',
    body: 'You may provide identifiers such as a name, email address, phone number, username, domain, IP address, image, incident notes, or evidence metadata when you ask Vindica to perform a lookup or organize a case.',
  },
  {
    title: 'How Vindica uses information',
    body: 'Vindica uses submitted information to perform requested scans, return provider-backed results, save account-scoped evidence or actions, operate the service, prevent abuse, and improve reliability. Vindica does not promise that every result is complete or current.',
  },
  {
    title: 'Providers and public sources',
    body: 'Some workflows query third-party providers or public sources. Those providers process requests under their own terms and privacy policies. A provider-unavailable response is not evidence that no exposure exists.',
  },
  {
    title: 'Accounts, storage, and retention',
    body: 'When account features are enabled, saved scans, command actions, reports, and evidence may be associated with your account. You should avoid submitting information you are not authorized to investigate. Retention controls and deletion requests can be requested through the privacy contact below.',
  },
  {
    title: 'Security and your choices',
    body: 'Vindica uses encrypted identifiers, access controls, and account-scoped workflows, but no system is perfectly secure. Signed-in users can delete saved scan data from the account vault. You may also request access, correction, or deletion by contacting privacy@vindica.me.',
  },
  {
    title: 'Removal requests and consent',
    body: 'Vindica sends a broker deletion or access request only after explicit confirmation. The request may transmit identifiers from your scan to an explicitly verified broker privacy contact. Brokers without a verified contact remain available through their official opt-out portal.',
  },
] as const

const termsSections = [
  {
    title: 'Authorized use only',
    body: 'You may use Vindica for your own privacy, for accounts or systems you manage, or for investigations where you have explicit authorization. You may not use Vindica to stalk, harass, dox, intimidate, discriminate against, or unlawfully monitor another person.',
  },
  {
    title: 'No proof of identity or wrongdoing',
    body: 'Matches, risk signals, public records, provider responses, and generated reports require human review. You must not treat a single result as proof that a person controls an account, committed misconduct, or is located at a particular address.',
  },
  {
    title: 'Prohibited activity',
    body: 'You may not attempt unauthorized access, active exploitation, credential attacks, service disruption, circumvention of provider limits, bulk scraping, or use that violates applicable law or a third party’s rights.',
  },
  {
    title: 'Service availability',
    body: 'Providers may be unavailable, delayed, incomplete, or inaccurate. Vindica may change, suspend, limit, or discontinue features. The service is provided without a guarantee that every exposure will be found or removed.',
  },
  {
    title: 'Responsibility and reporting',
    body: 'You are responsible for validating results and using them lawfully. Contact privacy@vindica.me for privacy requests and security@vindica.me to responsibly disclose a security concern.',
  },
] as const

export function LegalPage({ kind }: { kind: LegalKind }) {
  const isPrivacy = kind === 'privacy'
  const sections = isPrivacy ? privacySections : termsSections
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Use'
  const subtitle = isPrivacy
    ? 'What Vindica processes, why it is needed, and the choices you have.'
    : 'The rules that keep privacy-defense tools focused on safety and authorized use.'

  return (
    <div className="bg-[#050507] text-white">
      <section className="legal-hero relative overflow-hidden border-b border-white/10">
        <div className="legal-grid pointer-events-none absolute inset-0" />
        <div className="mx-auto grid min-h-[470px] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Vindica
            </Link>
            <p className="mt-10 text-xs font-black uppercase tracking-[0.24em] text-[#f5d7a1]">Trust center</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] text-[#fff7e8] sm:text-7xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">{subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
              <span className="border-l-2 border-red-500 pl-3">Effective June 7, 2026</span>
              <span className="border-l-2 border-[#d4af37] pl-3">Plain-language summary</span>
            </div>
          </div>
          <TrustArchitectureGraphic />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[270px_1fr] lg:px-8">
        <aside className="h-fit border-l border-white/10 pl-5 lg:sticky lg:top-28">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5d7a1]">On this page</p>
          <nav className="mt-5 grid gap-3">
            {sections.map((section, index) => (
              <a key={section.title} href={`#legal-${index}`} className="text-sm text-gray-500 transition-colors hover:text-white">
                {String(index + 1).padStart(2, '0')} / {section.title}
              </a>
            ))}
          </nav>
          <div className="mt-8 border-t border-white/10 pt-5 text-xs leading-6 text-gray-600">
            Questions or requests:
            <a href="mailto:privacy@vindica.me" className="mt-1 block font-semibold text-gray-300 hover:text-white">
              privacy@vindica.me
            </a>
          </div>
        </aside>

        <article className="max-w-4xl">
          <div className="border-b border-white/10 pb-8">
            <p className="text-base leading-8 text-gray-300">
              This page is intended to explain Vindica’s current product behavior in clear language. It should be reviewed by qualified legal counsel before commercial launch or material expansion into new jurisdictions.
            </p>
          </div>
          {sections.map((section, index) => (
            <section key={section.title} id={`legal-${index}`} className="scroll-mt-28 border-b border-white/10 py-9">
              <div className="grid gap-5 sm:grid-cols-[70px_1fr]">
                <div className="font-mono text-sm font-bold text-red-400">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <h2 className="text-2xl font-black text-white">{section.title}</h2>
                  <p className="mt-4 text-base leading-8 text-gray-400">{section.body}</p>
                </div>
              </div>
            </section>
          ))}
          <div className="mt-10 border border-[#d4af37]/20 bg-[#d4af37]/[0.04] p-6">
            <div className="flex items-start gap-4">
              <Scale className="mt-1 h-5 w-5 shrink-0 text-[#f5d7a1]" />
              <div>
                <h2 className="font-black text-white">Important launch note</h2>
                <p className="mt-2 text-sm leading-7 text-gray-400">
                  These documents are product-ready drafts, not jurisdiction-specific legal advice. Before charging customers, have counsel review retention, subprocessors, consumer-rights procedures, limitation-of-liability language, and governing-law provisions.
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

function TrustArchitectureGraphic() {
  const nodes = [
    { icon: Eye, label: 'Requested lookup', className: 'left-[4%] top-[16%]' },
    { icon: Database, label: 'Evidence record', className: 'right-[2%] top-[20%]' },
    { icon: FileCheck2, label: 'Saved action', className: 'left-[8%] bottom-[12%]' },
    { icon: ShieldCheck, label: 'Account scope', className: 'right-[5%] bottom-[14%]' },
  ] as const

  return (
    <div className="legal-trust-map relative mx-auto h-[360px] w-full max-w-[480px]">
      <div className="legal-orbit legal-orbit--outer" />
      <div className="legal-orbit legal-orbit--inner" />
      <div className="absolute left-1/2 top-1/2 z-10 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-red-500/35 bg-black shadow-[0_0_70px_rgba(186,24,27,0.32)]">
        <div className="text-center">
          <LockKeyhole className="mx-auto h-7 w-7 text-[#f5d7a1]" />
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">Private vault</div>
        </div>
      </div>
      {nodes.map(({ icon: Icon, label, className }) => (
        <div key={label} className={`absolute z-20 flex items-center gap-2 border border-white/10 bg-black/85 px-3 py-2 shadow-xl ${className}`}>
          <Icon className="h-4 w-4 text-red-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">{label}</span>
        </div>
      ))}
    </div>
  )
}
