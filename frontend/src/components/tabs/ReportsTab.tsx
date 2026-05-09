import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface Signal {
  id: string
  law: string
  jurisdiction: string
  triggered: boolean
  description: string
  action: string
  link: string
}

const LEGAL_SIGNALS: Signal[] = [
  {
    id: 'ccpa',
    law: 'CCPA / CPRA',
    jurisdiction: 'California',
    triggered: false,
    description: 'California Consumer Privacy Act gives residents the right to know, delete, and opt out of sale of personal data.',
    action: 'Submit deletion requests to all California-regulated businesses holding your data.',
    link: 'https://oag.ca.gov/privacy/ccpa',
  },
  {
    id: 'ftc5',
    law: 'FTC Act § 5',
    jurisdiction: 'Federal (US)',
    triggered: false,
    description: 'Prohibits unfair or deceptive acts. Data brokers who misrepresent data use or fail to honor opt-outs may be in violation.',
    action: 'File a complaint with the FTC if a broker refuses to honor your opt-out or misuses your data.',
    link: 'https://reportfraud.ftc.gov/',
  },
  {
    id: 'gdpr',
    law: 'GDPR Art. 17',
    jurisdiction: 'EU / UK',
    triggered: false,
    description: '"Right to be Forgotten" — you can request erasure of personal data from any EU/UK-regulated entity.',
    action: 'Submit Article 17 erasure requests to each data processor. They have 30 days to comply.',
    link: 'https://gdpr-info.eu/art-17-gdpr/',
  },
  {
    id: 'cyberstalking',
    law: 'Cyberstalking Laws',
    jurisdiction: 'Federal + State (US)',
    triggered: false,
    description: '18 U.S.C. § 2261A prohibits cyberstalking using email, internet, or electronic means. State laws may apply additionally.',
    action: 'Document all incidents with timestamps, screenshots, and URLs. Report to FBI IC3 and local law enforcement.',
    link: 'https://www.ic3.gov/',
  },
  {
    id: 'ncii',
    law: 'NCII / NDII Laws',
    jurisdiction: 'Federal + State (US)',
    triggered: false,
    description: 'Non-consensual intimate image laws exist in 48 US states. Federal SHIELD Act also applies in some cases.',
    action: 'Use StopNCII.org to hash images and prevent distribution. Report to platform trust & safety teams.',
    link: 'https://stopncii.org',
  },
  {
    id: 'platform',
    law: 'Platform Policy Violations',
    jurisdiction: 'Platform-specific',
    triggered: false,
    description: 'Social platforms prohibit doxxing, harassment, non-consensual sharing of personal info.',
    action: 'File reports with each platform\'s trust and safety team. Escalate to law enforcement if threats are present.',
    link: 'https://cybercivilrights.org/online-removal/',
  },
]

const AUTHORITY_LINKS = [
  { name: 'FBI IC3 (Internet Crime)', url: 'https://www.ic3.gov/', desc: 'File internet crime complaints' },
  { name: 'FTC Report Fraud', url: 'https://reportfraud.ftc.gov/', desc: 'Report deceptive business practices' },
  { name: 'CCRI Crisis Line', url: 'https://cybercivilrights.org/get-help/', desc: 'Cyber Civil Rights crisis helpline' },
  { name: 'StopNCII.org', url: 'https://stopncii.org', desc: 'Prevent spread of intimate images' },
  { name: 'NCMEC Take It Down', url: 'https://takeitdown.ncmec.org', desc: 'Remove NCII from platforms' },
  { name: 'State AG Privacy Portal', url: 'https://oag.ca.gov/privacy', desc: 'File state-level privacy complaints' },
]

function buildReport(signals: Signal[], notes: string): string {
  const triggered = signals.filter(s => s.triggered)
  const date = new Date().toLocaleString()
  return `DATAGUARD PRIVACY & LEGAL SIGNAL REPORT
Generated: ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRIGGERED LEGAL SIGNALS (${triggered.length})
${triggered.length === 0 ? 'None marked.' : triggered.map(s =>
  `\n● ${s.law} [${s.jurisdiction}]\n  ${s.description}\n  ACTION: ${s.action}\n  REF: ${s.link}`
).join('\n')}

${notes ? `\nCASE NOTES\n${notes}` : ''}

AUTHORITY CONTACTS
${AUTHORITY_LINKS.map(a => `● ${a.name}: ${a.url}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This report is for evidence documentation purposes only.
Consult a qualified attorney for legal advice.
`
}

const SIGNALS_KEY = 'dataguard-signals-v1'
const NOTES_KEY = 'dataguard-report-notes'

export function ReportsTab() {
  const [signals, setSignals] = useState<Signal[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SIGNALS_KEY) ?? '{}') as Record<string, boolean>
      return LEGAL_SIGNALS.map(s => ({ ...s, triggered: saved[s.id] ?? false }))
    } catch { return LEGAL_SIGNALS }
  })
  const [notes, setNotes] = useState(() => localStorage.getItem(NOTES_KEY) ?? '')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const map = Object.fromEntries(signals.map(s => [s.id, s.triggered]))
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(map))
  }, [signals])
  useEffect(() => { localStorage.setItem(NOTES_KEY, notes) }, [notes])

  function toggle(id: string) {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, triggered: !s.triggered } : s))
  }

  function copyReport() {
    navigator.clipboard.writeText(buildReport(signals, notes))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const triggeredCount = signals.filter(s => s.triggered).length

  return (
    <div className="space-y-5">
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <FileText className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Legal & Compliance Signal Builder</h2>
            <p className="text-xs text-gray-500">Evaluate which laws apply to your situation and build a report package</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Check each signal that applies to your situation. This generates a documentation packet for law enforcement, attorneys, or platform trust & safety teams.
        </p>
      </div>

      <div className="space-y-3">
        {signals.map(signal => (
          <div
            key={signal.id}
            className={`card-dark p-4 cursor-pointer transition-colors ${signal.triggered ? 'border-red-900/50 bg-red-950/10' : 'hover:border-gray-700'}`}
            onClick={() => toggle(signal.id)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {signal.triggered
                  ? <CheckCircle className="h-5 w-5 text-red-500" />
                  : <XCircle className="h-5 w-5 text-gray-700" />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-white text-sm">{signal.law}</span>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{signal.jurisdiction}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{signal.description}</p>
                {signal.triggered && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-red-300 bg-red-950/20 border border-red-900/30 rounded-lg p-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{signal.action}</span>
                  </div>
                )}
              </div>
              <a
                href={signal.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors flex-shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="card-dark p-5">
        <label className="block text-sm font-semibold text-white mb-2">Case Notes</label>
        <textarea
          className="input-field resize-none"
          rows={4}
          placeholder="Describe the situation, key dates, incident summaries, account URLs, evidence URLs…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Generate report */}
      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Generate Report Packet</h3>
            <p className="text-xs text-gray-500 mt-0.5">{triggeredCount} signal{triggeredCount !== 1 ? 's' : ''} marked · Ready to copy</p>
          </div>
          <button onClick={copyReport} className="btn-red">
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Report</>}
          </button>
        </div>
        <pre className="text-xs text-gray-500 bg-gray-950 rounded-xl p-4 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap">
          {buildReport(signals, notes)}
        </pre>
      </div>

      {/* Authority links */}
      <div className="card-dark p-5">
        <h3 className="font-semibold text-white mb-4">Report to Authorities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUTHORITY_LINKS.map(a => (
            <a
              key={a.name}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-800 bg-gray-900/30 hover:border-gray-700 transition-colors group"
            >
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{a.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{a.desc}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
