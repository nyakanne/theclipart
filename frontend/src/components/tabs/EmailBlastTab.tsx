import { useState, useEffect } from 'react'
import { Mail, Copy, Check, ChevronDown, ChevronUp, Send, User } from 'lucide-react'

interface Broker {
  name: string
  email: string
  category: string
  law: string
}

const BROKERS: Broker[] = [
  { name: 'Spokeo',           email: 'privacy@spokeo.com',               category: 'People Search', law: 'CCPA' },
  { name: 'WhitePages',       email: 'privacy@whitepages.com',           category: 'People Search', law: 'CCPA' },
  { name: 'BeenVerified',     email: 'privacy@beenverified.com',         category: 'People Search', law: 'CCPA' },
  { name: 'Intelius',         email: 'privacy@intelius.com',             category: 'People Search', law: 'CCPA' },
  { name: 'Radaris',          email: 'privacy@radaris.com',              category: 'People Search', law: 'CCPA' },
  { name: 'TruthFinder',      email: 'privacy@truthfinder.com',          category: 'People Search', law: 'CCPA' },
  { name: 'PeopleFinders',    email: 'privacy@peoplefinders.com',        category: 'People Search', law: 'CCPA' },
  { name: 'MyLife',           email: 'privacy@mylife.com',               category: 'People Search', law: 'CCPA' },
  { name: 'InstantCheckmate', email: 'support@instantcheckmate.com',     category: 'People Search', law: 'CCPA' },
  { name: 'Acxiom',           email: 'optout@acxiom.com',                category: 'Data Broker',   law: 'CCPA/GDPR' },
  { name: 'LexisNexis',       email: 'privacy@lexisnexis.com',           category: 'Data Broker',   law: 'CCPA/GDPR' },
  { name: 'Epsilon',          email: 'optout@epsilon.com',               category: 'Data Broker',   law: 'CCPA' },
  { name: 'CoreLogic',        email: 'privacy@corelogic.com',            category: 'Data Broker',   law: 'CCPA' },
  { name: 'ZoomInfo',         email: 'privacy@zoominfo.com',             category: 'B2B Data',      law: 'CCPA/GDPR' },
  { name: 'Apollo.io',        email: 'privacy@apollo.io',                category: 'B2B Data',      law: 'CCPA/GDPR' },
  { name: 'Oracle Data Cloud','email': 'datacloudoptout@oracle.com',     category: 'Ad Network',    law: 'CCPA' },
]

const TEMPLATES = {
  ccpa: (name: string, email: string, broker: string) => ({
    subject: `CCPA Deletion Request — ${name}`,
    body: `To the Privacy Team at ${broker},

I am submitting a verified consumer request under the California Consumer Privacy Act (CCPA / CPRA), Cal. Civ. Code § 1798.105, to request the deletion of all personal information you hold about me.

Full name: ${name}
Email address: ${email}

Please delete all personal information associated with the above identifiers from your databases, including but not limited to name, address, phone number, email, employment history, and any inferred data.

Under CCPA, you are required to comply within 45 days. Please confirm receipt and provide a case/reference number.

Thank you,
${name}`,
  }),
  gdpr: (name: string, email: string, broker: string) => ({
    subject: `GDPR Article 17 Erasure Request — ${name}`,
    body: `To the Data Protection Officer at ${broker},

I am submitting a request for erasure under Article 17 of the General Data Protection Regulation (GDPR), the "Right to be Forgotten."

Full name: ${name}
Email address: ${email}

I request that you erase all personal data you hold about me without undue delay. I do not believe there is any legitimate purpose or legal ground that overrides my right to erasure.

You are required to respond within 30 days of receipt. Please confirm this request has been received and provide a reference number.

Regards,
${name}`,
  }),
  general: (name: string, email: string, broker: string) => ({
    subject: `Opt-Out & Data Deletion Request — ${name}`,
    body: `To Whom It May Concern at ${broker},

I am writing to formally request that you remove all personal information associated with me from your records and databases.

Full name: ${name}
Email address: ${email}

I am opting out of all data collection, sale, and sharing. Please remove my profile, associated records, and any derived or inferred data from your systems.

Please confirm in writing that this request has been processed.

Thank you,
${name}`,
  }),
}

type Template = keyof typeof TEMPLATES
const STORAGE_KEY = 'phantom-emailblast-v1'

export function EmailBlastTab() {
  const [yourName, setYourName] = useState(() => localStorage.getItem('phantom-your-name') ?? '')
  const [yourEmail, setYourEmail] = useState(() => localStorage.getItem('phantom-your-email') ?? '')
  const [template, setTemplate] = useState<Template>('ccpa')
  const [sent, setSent] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(sent)) }, [sent])
  useEffect(() => { localStorage.setItem('phantom-your-name', yourName) }, [yourName])
  useEffect(() => { localStorage.setItem('phantom-your-email', yourEmail) }, [yourEmail])

  function markSent(name: string) {
    setSent(prev => ({ ...prev, [name]: true }))
  }

  function copyEmail(broker: Broker) {
    const { body } = TEMPLATES[template](yourName, yourEmail, broker.name)
    navigator.clipboard.writeText(body)
    setCopied(broker.name)
    setTimeout(() => setCopied(null), 2000)
  }

  function openMailto(broker: Broker) {
    const { subject, body } = TEMPLATES[template](yourName, yourEmail, broker.name)
    window.open(`mailto:${broker.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    markSent(broker.name)
  }

  const sentCount = Object.values(sent).filter(Boolean).length
  const remaining = BROKERS.length - sentCount

  return (
    <div className="space-y-5">
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Mail className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Email Blast — Data Deletion Requests</h2>
            <p className="text-xs text-gray-500">Send CCPA / GDPR deletion requests to every broker with one click</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{sentCount} sent</span>
            <span>{remaining} remaining</span>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((sentCount / BROKERS.length) * 100)}%` }}
            />
          </div>
        </div>

        {/* Your info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
            <input className="input-field pl-9" placeholder="Your full legal name" value={yourName} onChange={e => setYourName(e.target.value)} />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
            <input className="input-field pl-9" placeholder="Your email address" value={yourEmail} onChange={e => setYourEmail(e.target.value)} />
          </div>
        </div>

        {/* Template selector */}
        <div className="flex gap-2">
          {(['ccpa', 'gdpr', 'general'] as Template[]).map(t => (
            <button
              key={t}
              onClick={() => setTemplate(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                template === t
                  ? 'bg-red-950/60 text-red-400 border-red-900/50'
                  : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
          <span className="text-xs text-gray-600 self-center ml-1">
            {template === 'ccpa' ? 'Best for US residents' : template === 'gdpr' ? 'Best for EU/UK residents' : 'Universal'}
          </span>
        </div>
      </div>

      {(!yourName || !yourEmail) && (
        <div className="px-4 py-3 rounded-xl border border-yellow-900/40 bg-yellow-950/20 text-xs text-yellow-400">
          Enter your name and email above to personalize the deletion requests before sending.
        </div>
      )}

      {/* Broker list */}
      <div className="card-dark divide-y divide-gray-900">
        {BROKERS.map(broker => {
          const isSent = sent[broker.name]
          const isOpen = expanded === broker.name
          const { subject, body } = TEMPLATES[template](yourName || 'Your Name', yourEmail || 'your@email.com', broker.name)

          return (
            <div key={broker.name} className={`transition-colors ${isSent ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 p-4">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isSent ? 'bg-green-500' : 'bg-gray-700'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{broker.name}</span>
                    <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{broker.category}</span>
                    <span className="text-[10px] bg-red-950/40 text-red-500/70 px-1.5 py-0.5 rounded">{broker.law}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{broker.email}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setExpanded(isOpen ? null : broker.name)} className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                  <button onClick={() => copyEmail(broker)} className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                    {copied === broker.name ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                  <button
                    onClick={() => openMailto(broker)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isSent
                        ? 'bg-green-950/40 text-green-500 border border-green-900/40'
                        : 'btn-red'
                    }`}
                  >
                    <Send className="h-3 w-3" />
                    {isSent ? 'Sent' : 'Send'}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="rounded-xl bg-gray-950 border border-gray-800 p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-400">Subject: <span className="text-gray-300">{subject}</span></p>
                    <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed font-sans">{body}</pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card-dark p-4 text-center">
        <p className="text-xs text-gray-600">
          Brokers must respond within <span className="text-gray-400">45 days (CCPA)</span> or <span className="text-gray-400">30 days (GDPR)</span>.
          Keep your sent confirmation emails as evidence of your requests.
        </p>
      </div>
    </div>
  )
}
