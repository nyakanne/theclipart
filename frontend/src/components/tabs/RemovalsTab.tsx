import { useState, useEffect } from 'react'
import { ExternalLink, Copy, Check, CheckCircle, Clock, AlertCircle, Trash2, RefreshCw } from 'lucide-react'

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
  // ── People Search ─────────────────────────────────────────────────────────
  { name: 'Spokeo',            category: 'People Search', opt_out_url: 'https://www.spokeo.com/opt_out/new',                                  instructions: 'Search for your listing, copy the profile URL, paste into the opt-out form.',                                 method: 'Web form' },
  { name: 'WhitePages',        category: 'People Search', opt_out_url: 'https://www.whitepages.com/suppression-requests',                     instructions: 'Find your listing, click "Remove Me", verify via phone call.',                                              method: 'Phone verify' },
  { name: 'BeenVerified',      category: 'People Search', opt_out_url: 'https://www.beenverified.com/app/optout/search',                      instructions: 'Search your profile, click the opt-out button, verify via email.',                                          method: 'Email verify' },
  { name: 'Intelius',          category: 'People Search', opt_out_url: 'https://www.intelius.com/opt-out',                                    instructions: 'Submit opt-out form. Processing takes up to 72 hours.',                                                    method: 'Web form' },
  { name: 'Radaris',           category: 'People Search', opt_out_url: 'https://radaris.com/control/privacy',                                 instructions: 'Create an account, find your listing, and request removal.',                                               method: 'Account required' },
  { name: 'TruthFinder',       category: 'People Search', opt_out_url: 'https://www.truthfinder.com/opt-out/',                                instructions: 'Submit opt-out form. Can take up to 5 business days.',                                                     method: 'Web form' },
  { name: 'PeopleFinders',     category: 'People Search', opt_out_url: 'https://www.peoplefinders.com/manage/',                               instructions: 'Submit your name and address to be removed from results.',                                                 method: 'Web form' },
  { name: 'MyLife',            category: 'People Search', opt_out_url: 'https://www.mylife.com/ccpa/index.pubview',                           instructions: 'Submit CCPA request. Requires name and email address.',                                                    method: 'CCPA request', email_template: 'ccpa' },
  { name: 'PeopleSmart',       category: 'People Search', opt_out_url: 'https://www.peoplesmart.com/optout-go',                               instructions: 'Search your listing and use the opt-out link on your profile.',                                            method: 'Web form' },
  { name: 'Instant Checkmate', category: 'People Search', opt_out_url: 'https://www.instantcheckmate.com/opt-out/',                           instructions: 'Submit opt-out form with your name. Verify via email link.',                                               method: 'Email verify' },
  { name: 'US Search',         category: 'People Search', opt_out_url: 'https://www.ussearch.com/opt-out/',                                   instructions: 'Search for your listing, click opt-out, verify via email.',                                                method: 'Email verify' },
  { name: 'FastPeopleSearch',  category: 'People Search', opt_out_url: 'https://www.fastpeoplesearch.com/removal',                            instructions: 'Search for your listing and use the "Remove My Info" button.',                                             method: 'Web form' },
  { name: 'TruePeopleSearch',  category: 'People Search', opt_out_url: 'https://www.truepeoplesearch.com/removal',                            instructions: 'Find your profile and submit the removal request.',                                                       method: 'Web form' },
  { name: 'Addresses.com',     category: 'People Search', opt_out_url: 'https://www.addresses.com/optout.php',                                instructions: 'Submit opt-out with full name and address.',                                                               method: 'Web form' },
  { name: 'AnyWho',            category: 'People Search', opt_out_url: 'https://www.anywho.com/privacy',                                     instructions: 'Use the privacy request form to remove your listing.',                                                     method: 'Web form' },
  { name: 'Pipl',              category: 'People Search', opt_out_url: 'https://pipl.com/personal-information-removal-request',               instructions: 'Submit personal information removal request form.',                                                       method: 'Web form' },
  { name: 'Peopleby',          category: 'People Search', opt_out_url: 'https://peopleby.com',                                                instructions: 'Navigate to your listing and request removal.',                                                            method: 'Web form' },
  { name: 'ClustrMaps',        category: 'People Search', opt_out_url: 'https://clustrmaps.com/bl/opt-out',                                   instructions: 'Use the opt-out link to remove your address and cluster data.',                                            method: 'Web form' },
  { name: 'Nuwber',            category: 'People Search', opt_out_url: 'https://nuwber.com/removal/link',                                     instructions: 'Submit your information to request removal from results.',                                                 method: 'Web form' },
  { name: 'Neighbor.report',   category: 'People Search', opt_out_url: 'https://neighbor.report',                                             instructions: 'Search for your listing and use the removal option.',                                                     method: 'Web form' },
  { name: 'Lexis Nexis',       category: 'People Search', opt_out_url: 'https://optout.lexisnexis.com/',                                      instructions: 'Complete the opt-out form. May require last 4 of SSN for verification.',                                   method: 'Web form' },
  { name: 'PublicRecordsNow',  category: 'People Search', opt_out_url: 'https://www.publicrecordsnow.com/static/view/optout',                 instructions: 'Submit name and location to remove your public record listing.',                                           method: 'Web form' },
  { name: 'Arrests.org',       category: 'Public Records', opt_out_url: 'https://arrests.org/removal.php',                                    instructions: 'Submit removal request with full name and date of birth.',                                                 method: 'Web form' },
  { name: 'Mugshots.com',      category: 'Public Records', opt_out_url: 'https://mugshots.com/remove-mugshot.html',                           instructions: 'Submit your mugshot removal request. May require ID verification.',                                        method: 'ID verify' },
  // ── Data Brokers ──────────────────────────────────────────────────────────
  { name: 'Acxiom',            category: 'Data Broker',   opt_out_url: 'https://www.acxiom.com/optout/',                                      instructions: 'Submit CCPA deletion request. Include full name, address, and DOB.',                                       method: 'CCPA request', email_template: 'ccpa' },
  { name: 'Epsilon',           category: 'Data Broker',   opt_out_url: 'https://us.epsilon.com/privacy-policy',                               instructions: 'Email optout@epsilon.com with your full name and address.',                                                method: 'Email', email_template: 'ccpa' },
  { name: 'CoreLogic',         category: 'Data Broker',   opt_out_url: 'https://www.corelogic.com/privacy-center/',                           instructions: 'Submit CCPA/GDPR data deletion request via their privacy center.',                                         method: 'CCPA request', email_template: 'ccpa' },
  { name: 'Equifax',           category: 'Data Broker',   opt_out_url: 'https://www.equifax.com/personal/privacy/',                           instructions: 'Request your data and submit deletion via Equifax privacy portal.',                                        method: 'Web form' },
  { name: 'Experian',          category: 'Data Broker',   opt_out_url: 'https://www.experian.com/privacy/center.html',                        instructions: 'Submit opt-out request via Experian privacy center.',                                                     method: 'Web form' },
  { name: 'TransUnion',        category: 'Data Broker',   opt_out_url: 'https://www.transunion.com/consumer-privacy',                         instructions: 'Submit data deletion request via TransUnion privacy portal.',                                             method: 'Web form' },
  { name: 'Datalogix',         category: 'Data Broker',   opt_out_url: 'https://datacloudoptout.oracle.com/',                                 instructions: 'Opt out via Oracle Data Cloud (acquired Datalogix).',                                                     method: 'Web form' },
  { name: 'Verisk',            category: 'Data Broker',   opt_out_url: 'https://www.verisk.com/privacy/',                                     instructions: 'Contact privacy@verisk.com with deletion request.',                                                      method: 'Email', email_template: 'ccpa' },
  { name: 'Harte-Hanks',       category: 'Data Broker',   opt_out_url: 'https://www.harte-hanks.com/privacy-policy/',                        instructions: 'Contact dataprotection@harte-hanks.com to request deletion.',                                            method: 'Email', email_template: 'gdpr' },
  // ── Ad Networks ───────────────────────────────────────────────────────────
  { name: 'Oracle Data Cloud', category: 'Ad Network',    opt_out_url: 'https://datacloudoptout.oracle.com/',                                 instructions: 'Opt out of Oracle\'s marketing data products.',                                                           method: 'Web form' },
  { name: 'Nielsen',           category: 'Ad Network',    opt_out_url: 'https://www.nielsen.com/us/en/legal/privacy-statement/digital-measurement/',instructions: 'Use Nielsen opt-out tool to remove from digital measurement.',                                    method: 'Web form' },
  { name: 'LiveRamp',          category: 'Ad Network',    opt_out_url: 'https://liveramp.com/opt_out/',                                       instructions: 'Submit opt-out from LiveRamp\'s identity resolution network.',                                            method: 'Web form' },
  { name: 'Tapad',             category: 'Ad Network',    opt_out_url: 'https://www.tapad.com/privacy.html',                                  instructions: 'Opt out of cross-device tracking via Tapad privacy portal.',                                              method: 'Web form' },
  { name: 'Lotame',            category: 'Ad Network',    opt_out_url: 'https://www.lotame.com/about-lotame/privacy/lotames-opt-out-page-for-interest-based-advertising/',instructions: 'Opt out of interest-based advertising.',                               method: 'Web form' },
  // ── B2B / Professional ─────────────────────────────────────────────────────
  { name: 'ZoomInfo',          category: 'B2B Data',      opt_out_url: 'https://www.zoominfo.com/business/login',                             instructions: 'Request profile removal via privacy@zoominfo.com.',                                                      method: 'Email', email_template: 'gdpr' },
  { name: 'Apollo.io',         category: 'B2B Data',      opt_out_url: 'https://privacy.apollo.io/',                                         instructions: 'Submit data deletion request via Apollo privacy portal.',                                                 method: 'Web form' },
  { name: 'Hunter.io',         category: 'B2B Data',      opt_out_url: 'https://hunter.io/privacy',                                          instructions: 'Request email removal via Hunter\'s opt-out form.',                                                      method: 'Web form' },
  { name: 'Clearbit',          category: 'B2B Data',      opt_out_url: 'https://clearbit.com/privacy',                                       instructions: 'Submit deletion request to privacy@clearbit.com.',                                                       method: 'Email', email_template: 'gdpr' },
  { name: 'FullContact',       category: 'B2B Data',      opt_out_url: 'https://www.fullcontact.com/privacy/privacy-options/',                instructions: 'Submit opt-out via FullContact privacy options page.',                                                    method: 'Web form' },
  { name: 'Lusha',             category: 'B2B Data',      opt_out_url: 'https://www.lusha.com/privacy-policy/',                              instructions: 'Email privacy@lusha.co to request profile removal.',                                                     method: 'Email', email_template: 'gdpr' },
  // ── Financial / Insurance ─────────────────────────────────────────────────
  { name: 'Innovis',           category: 'Financial',     opt_out_url: 'https://www.innovis.com/personal/optOut',                             instructions: 'Opt out of pre-screened credit offers via Innovis.',                                                     method: 'Web form' },
  { name: 'ChexSystems',       category: 'Financial',     opt_out_url: 'https://www.chexsystems.com/consumer-center/optout',                  instructions: 'Opt out from ChexSystems banking data sharing.',                                                        method: 'Web form' },
  { name: 'Sagestream',        category: 'Financial',     opt_out_url: 'https://www.sagestreamllc.com/consumer-opt-out/',                    instructions: 'Submit opt-out to remove from specialty credit files.',                                                   method: 'Web form' },
]

const CCPA_TEMPLATE = (name: string) => `Subject: CCPA Data Deletion Request

To Whom It May Concern,

Pursuant to the California Consumer Privacy Act (CCPA) / CPRA, I am requesting the deletion of all personal information you have collected about me.

Full Name: ${name || '[YOUR FULL NAME]'}
State: California (or applicable state)

Please confirm receipt and completion of this request within 45 days as required by law.

Sincerely,
${name || '[YOUR NAME]'}`

const GDPR_TEMPLATE = (name: string) => `Subject: GDPR Right to Erasure Request (Article 17)

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

const STORAGE_KEY = 'dataguard-removals-v1'

function loadSaved(): Record<string, Status> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function initBrokers(): Broker[] {
  const saved = loadSaved()
  return BROKER_LIST.map((b, i) => ({
    ...b,
    id:     String(i),
    status: saved[b.name] ?? 'pending',
  }))
}

export function RemovalsTab() {
  const [name, setName]       = useState(() => localStorage.getItem('dataguard-removal-name') ?? '')
  const [brokers, setBrokers] = useState<Broker[]>(initBrokers)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const [filter, setFilter]   = useState<Status | 'all'>('all')
  const [search, setSearch]   = useState('')

  // Persist statuses on every change
  useEffect(() => {
    const record: Record<string, Status> = {}
    brokers.forEach(b => { record[b.name] = b.status })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  }, [brokers])

  // Persist name
  useEffect(() => {
    localStorage.setItem('dataguard-removal-name', name)
  }, [name])

  const filtered = brokers
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    pending:   brokers.filter(b => b.status === 'pending').length,
    submitted: brokers.filter(b => b.status === 'submitted').length,
    confirmed: brokers.filter(b => b.status === 'confirmed').length,
    failed:    brokers.filter(b => b.status === 'failed').length,
  }

  const progress = Math.round((counts.confirmed / brokers.length) * 100)

  function setStatus(id: string, status: Status) {
    setBrokers(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  function markAllSubmitted() {
    setBrokers(prev => prev.map(b => b.status === 'pending' ? { ...b, status: 'submitted' } : b))
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
          <div className="flex-1">
            <h2 className="font-bold text-white">Opt-Out Command Center</h2>
            <p className="text-xs text-gray-500">{brokers.length} data brokers · Your progress is saved automatically</p>
          </div>
          <button onClick={markAllSubmitted} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" /> Mark all submitted
          </button>
        </div>

        <input
          className="input-field"
          placeholder="Your full name (pre-fills email templates)"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{counts.confirmed} confirmed removals</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-700 to-green-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending',   value: counts.pending,   color: 'text-gray-400' },
          { label: 'Submitted', value: counts.submitted, color: 'text-yellow-400' },
          { label: 'Confirmed', value: counts.confirmed, color: 'text-green-400' },
          { label: 'Failed',    value: counts.failed,    color: 'text-red-400' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.label.toLowerCase() as Status)}
            className={`card-dark p-3 text-center hover:border-gray-700 transition-colors ${filter === s.label.toLowerCase() ? 'border-gray-600' : ''}`}
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Search brokers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-red-950/50 text-red-400 border-red-900/40' : 'text-gray-500 border-gray-800'}`}
        >
          All ({brokers.length})
        </button>
      </div>

      {/* Broker list */}
      <div className="space-y-2">
        {filtered.map(broker => (
          <div key={broker.id} className="card-dark p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">{STATUS_ICON[broker.status]}</div>
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
                    onClick={() => broker.status === 'pending' && setStatus(broker.id, 'submitted')}
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
                        : <><Copy className="h-3 w-3" /> Copy {broker.email_template.toUpperCase()} Email</>}
                    </button>
                  )}

                  <div className="flex gap-1 ml-auto">
                    {(['pending', 'submitted', 'confirmed', 'failed'] as Status[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(broker.id, s)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors capitalize ${
                          broker.status === s
                            ? s === 'confirmed' ? 'bg-green-950/50 text-green-400 border-green-900/40'
                            : s === 'submitted' ? 'bg-yellow-950/50 text-yellow-400 border-yellow-900/40'
                            : s === 'failed'    ? 'bg-red-950/50 text-red-400 border-red-900/40'
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
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-white font-semibold">How this works:</span> Click "Open Opt-Out Page" — it automatically marks the broker as Submitted. Complete the form on their site, then mark it Confirmed here after you receive their confirmation. Your progress is saved to this device automatically. Check back in 30–90 days to verify removal.
        </p>
      </div>
    </div>
  )
}
