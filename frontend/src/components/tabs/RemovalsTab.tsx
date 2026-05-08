import { useState } from 'react'
import { ExternalLink, Copy, Check, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react'

type Status = 'pending' | 'submitted' | 'confirmed' | 'failed'

interface Broker {
  id: string
  name: string
  category: string
  opt_out_url: string
  instructions: string
  method: string
  status: Status
  email_template?: string
}

const BROKER_LIST: Omit<Broker, 'id' | 'status'>[] = [
  { name: 'Spokeo', category: 'People Search', opt_out_url: 'https://www.spokeo.com/opt_out/new', instructions: 'Search for your listing, copy the profile URL, and paste it into the opt-out form.', method: 'Web form', email_template: undefined },
  { name: 'WhitePages', category: 'People Search', opt_out_url: 'https://www.whitepages.com/suppression-requests', instructions: 'Find your listing, click "Remove Me", verify via phone call.', method: 'Phone verify' },
  { name: 'BeenVerified', category: 'People Search', opt_out_url: 'https://www.beenverified.com/app/optout/search', instructions: 'Search for your profile, click the opt-out button, verify via email.', method: 'Email verify' },
  { name: 'Intelius', category: 'People Search', opt_out_url: 'https://www.intelius.com/opt-out', instructions: 'Submit opt-out form. Processing takes up to 72 hours.', method: 'Web form' },
  { name: 'Radaris', category: 'People Search', opt_out_url: 'https://radaris.com/control/privacy', instructions: 'Create an account, find your listing, and request removal.', method: 'Account required' },
  { name: 'TruthFinder', category: 'People Search', opt_out_url: 'https://www.truthfinder.com/opt-out/', instructions: 'Submit opt-out form. Can take up to 5 business days.', method: 'Web form' },
  { name: 'Acxiom', category: 'Data Broker', opt_out_url: 'https://www.acxiom.com/optout/', instructions: 'Submit CCPA deletion request. Include your name, address, DOB.', method: 'CCPA request', email_template: 'ccpa' },
  { name: 'LexisNexis', category: 'Data Broker', opt_out_url: 'https://optout.lexisnexis.com/', instructions: 'Complete the opt-out form with full name and SSN last 4.', method: 'Web form' },
  { name: 'Oracle Data Cloud', category: 'Ad Network', opt_out_url: 'https://datacloudoptout.oracle.com/', instructions: 'Submit opt-out to remove from Oracle\'s marketing data products.', method: 'Web form' },
  { name: 'ZoomInfo', category: 'B2B Data', opt_out_url: 'https://www.zoominfo.com/business/login', instructions: 'Submit a profile removal request. Use privacy@zoominfo.com.', method: 'Email', email_template: 'gdpr' },
  { name: 'PeopleFinders', category: 'People Search', opt_out_url: 'https://www.peoplefinders.com/manage/', instructions: 'Submit your name and address to be removed from results.', method: 'Web form' },
  { name: 'MyLife', category: 'People Search', opt_out_url: 'https://www.mylife.com/ccpa/index.pubview', instructions: 'Submit CCPA request. Requires name and email address.', method: 'CCPA request', email_template: 'ccpa' },
]

const CCPA_TEMPLATE = (name: string) => `Subject: CCPA Data Deletion Request

To Whom It May Concern,

Pursuant to the California Consumer Privacy Act (CCPA) / CPRA, I am requesting the deletion of all personal information you have collected about me.

Full Name: ${name || '[YOUR FULL NAME]'}
State: California (or applicable state)

Please confirm receipt and completion of this request within 45 days.

Sincerely,
${name || '[YOUR NAME]'}`

const GDPR_TEMPLATE = (name: string) => `Subject: GDPR / Right to Erasure Request (Article 17)

To Whom It May Concern,

I am writing to request erasure of all personal data you hold about me, pursuant to Article 17 of the GDPR ("Right to be Forgotten").

Full Name: ${name || '[YOUR FULL NAME]'}
Email: [YOUR EMAIL]

Please confirm deletion within 30 days as required by GDPR.

Sincerely,
${name || '[YOUR NAME]'}`

const STATUS_ICON: Record<Status, JSX.Element> = {
  pending:   <Clock className="h-4 w-4 text-gray-500" />,
  submitted: <AlertCircle className="h-4 w-4 text-yellow-400" />,
  confirmed: <CheckCircle className="h-4 w-4 text-green-400" />,
  failed:    <AlertCircle className="h-4 w-4 text-red-400" />,
}


export function RemovalsTab() {
  const [name, setName] = useState('')
  const [brokers, setBrokers] = useState<Broker[]>(() =>
    BROKER_LIST.map((b, i) => ({ ...b, id: String(i), status: 'pending' }))
  )
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status | 'all'>('all')

  const filtered = filter === 'all' ? brokers : brokers.filter(b => b.status === filter)
  const counts = { pending: brokers.filter(b => b.status === 'pending').length, submitted: brokers.filter(b => b.status === 'submitted').length, confirmed: brokers.filter(b => b.status === 'confirmed').length }

  function setStatus(id: string, status: Status) {
    setBrokers(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  function copyTemplate(type: string, key: string) {
    const text = type === 'ccpa' ? CCPA_TEMPLATE(name) : GDPR_TEMPLATE(name)
    navigator.clipboard.writeText(text)
    setCopiedTemplate(key)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Trash2 className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">One-Stop Opt-Out Queue</h2>
            <p className="text-xs text-gray-500">Track your removal requests across all data brokers</p>
          </div>
        </div>
        <input
          className="input-field"
          placeholder="Your full name (for email templates)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <p className="text-xs text-gray-600 mt-2">Your name stays local — it's only used to pre-fill copy-paste email templates.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: counts.pending, color: 'text-gray-400' },
          { label: 'Submitted', value: counts.submitted, color: 'text-yellow-400' },
          { label: 'Confirmed', value: counts.confirmed, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="card-dark p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'submitted', 'confirmed', 'failed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border capitalize ${
              filter === f ? 'bg-red-950/50 text-red-400 border-red-900/40' : 'text-gray-500 border-gray-800 hover:border-gray-700'
            }`}
          >
            {f === 'all' ? `All (${brokers.length})` : f}
          </button>
        ))}
      </div>

      {/* Broker list */}
      <div className="space-y-3">
        {filtered.map(broker => (
          <div key={broker.id} className="card-dark p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{STATUS_ICON[broker.status]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{broker.name}</span>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{broker.category}</span>
                  <span className="text-[10px] text-gray-600">{broker.method}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{broker.instructions}</p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <a
                    href={broker.opt_out_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-900/40 bg-red-950/20 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> Open Opt-Out Page
                  </a>

                  {broker.email_template && (
                    <button
                      onClick={() => copyTemplate(broker.email_template!, `${broker.id}-${broker.email_template}`)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedTemplate === `${broker.id}-${broker.email_template}`
                        ? <><Check className="h-3 w-3 text-green-400" /> Copied!</>
                        : <><Copy className="h-3 w-3" /> Copy {broker.email_template.toUpperCase()} Email</>
                      }
                    </button>
                  )}

                  {/* Status buttons */}
                  <div className="flex gap-1 ml-auto">
                    {(['pending', 'submitted', 'confirmed'] as Status[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(broker.id, s)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors capitalize ${
                          broker.status === s
                            ? s === 'confirmed' ? 'bg-green-950/50 text-green-400 border-green-900/40'
                            : s === 'submitted' ? 'bg-yellow-950/50 text-yellow-400 border-yellow-900/40'
                            : 'bg-gray-800 text-gray-300 border-gray-700'
                            : 'text-gray-600 border-gray-900 hover:border-gray-800'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-dark p-4">
        <p className="text-xs text-gray-500">
          <span className="text-yellow-400 font-semibold">Note:</span> This is a self-service tracker. No automated opt-out submissions are made. Links open each broker's official removal page. Always verify removal after 30–90 days.
        </p>
      </div>
    </div>
  )
}
