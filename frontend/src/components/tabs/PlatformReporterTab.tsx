import { useState, useEffect } from 'react'
import { Send, ExternalLink, Check, Copy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

type Category = 'doxxing' | 'harassment' | 'ncii' | 'stalking' | 'impersonation'

interface Platform {
  name: string
  reportUrl: string
  trustEmail?: string
  category: string
  notes?: string
}

const PLATFORMS: Platform[] = [
  { name: 'Meta (Facebook/Instagram)', reportUrl: 'https://www.facebook.com/help/contact/274459462613911', trustEmail: 'records@fb.com', category: 'Social', notes: 'Also use the in-app report button on the specific post or profile' },
  { name: 'Instagram', reportUrl: 'https://help.instagram.com/contact/584460464982589', category: 'Social' },
  { name: 'X (Twitter)', reportUrl: 'https://help.twitter.com/forms/safety', trustEmail: 'safety@twitter.com', category: 'Social' },
  { name: 'TikTok', reportUrl: 'https://www.tiktok.com/legal/report/privacy', trustEmail: 'privacy@tiktok.com', category: 'Social' },
  { name: 'Snapchat', reportUrl: 'https://support.snapchat.com/a/report-abuse-in-app', trustEmail: 'privacy@snap.com', category: 'Social' },
  { name: 'YouTube', reportUrl: 'https://support.google.com/youtube/answer/2802027', category: 'Social' },
  { name: 'Reddit', reportUrl: 'https://www.reddit.com/report', trustEmail: 'legal@reddit.com', category: 'Social' },
  { name: 'Discord', reportUrl: 'https://discord.com/safety', trustEmail: 'abuse@discord.com', category: 'Social' },
  { name: 'Twitch', reportUrl: 'https://safety.twitch.tv/s/article/How-to-Report-Abuse', trustEmail: 'legal@twitch.tv', category: 'Streaming' },
  { name: 'LinkedIn', reportUrl: 'https://www.linkedin.com/help/linkedin/answer/a1341508', trustEmail: 'privacy@linkedin.com', category: 'Professional' },
  { name: 'OnlyFans', reportUrl: 'https://onlyfans.com/privacy', trustEmail: 'support@onlyfans.com', category: 'Content', notes: 'Use DMCA takedown for stolen content' },
  { name: 'Pornhub', reportUrl: 'https://www.pornhub.com/content-removal', trustEmail: 'dmca@pornhub.com', category: 'Content', notes: 'Submit NCII removal and DMCA requests' },
  { name: 'Google Search', reportUrl: 'https://support.google.com/websearch/troubleshooter/9685456', category: 'Search', notes: 'Remove intimate images, personal info, doxxing content from search results' },
  { name: 'Bing', reportUrl: 'https://www.microsoft.com/en-us/concern/bing', category: 'Search' },
  { name: 'Cloudflare', reportUrl: 'https://abuse.cloudflare.com/', trustEmail: 'abusereply@cloudflare.com', category: 'Hosting', notes: 'Hosts much of the web — report abuse on sites using Cloudflare' },
  { name: 'GitHub', reportUrl: 'https://support.github.com/contact/report-abuse', trustEmail: 'privacy@github.com', category: 'Dev', notes: 'Report doxxing repos or personal data posted in code/issues' },
  { name: 'Pastebin', reportUrl: 'https://pastebin.com/doc_abuse', category: 'Hosting', notes: 'Common doxxing dump site' },
  { name: 'Apple App Store', reportUrl: 'https://reportaproblem.apple.com/', category: 'App Store' },
  { name: 'Google Play Store', reportUrl: 'https://support.google.com/googleplay/android-developer/contact/takedown', category: 'App Store' },
]

const TEMPLATES: Record<Category, (name: string, platform: string, details: string) => { subject: string; body: string }> = {
  doxxing: (name, platform, details) => ({
    subject: `Urgent: Doxxing / Personal Information Exposure — ${name}`,
    body: `To the Trust & Safety Team at ${platform},

My name is ${name}. I am writing to report an urgent case of doxxing — the non-consensual public exposure of my private personal information.

My home address, phone number, and/or other identifying information has been posted on your platform without my consent, placing me at immediate safety risk.

${details ? `Details:\n${details}\n` : ''}
I am requesting:
1. Immediate removal of all content containing my personal information
2. Account suspension of the individual(s) responsible
3. Preservation of logs for potential law enforcement referral

I have documented this incident and may be working with law enforcement. Time is critical — doxxing puts victims at risk of physical harm.

Please respond with a case/reference number.

Regards,
${name}`,
  }),
  harassment: (name, platform, details) => ({
    subject: `Harassment Campaign Report — ${name}`,
    body: `To the Trust & Safety Team at ${platform},

My name is ${name}. I am reporting a coordinated harassment campaign targeting me on your platform.

${details ? `Details:\n${details}\n` : ''}
This harassment violates your platform's community guidelines and constitutes cyberstalking under 18 U.S.C. § 2261A and/or applicable state law.

I am requesting:
1. Removal of all harassing content
2. Account suspension of all accounts participating in the campaign
3. Preservation of records for law enforcement

I have filed / am filing a report with law enforcement and the FBI IC3 (ic3.gov).

Please respond with a case/reference number.

Regards,
${name}`,
  }),
  ncii: (name, platform, details) => ({
    subject: `Non-Consensual Intimate Image (NCII) Removal Request — Urgent`,
    body: `To the Trust & Safety Team at ${platform},

I am writing to report the non-consensual posting of intimate images of me on your platform. This is a severe violation of your policies and is illegal in 48 US states and under federal law (SHIELD Act, 15 U.S.C. § 6851).

${details ? `Details:\n${details}\n` : ''}
I am requesting:
1. Immediate takedown of all NCII content
2. Permanent ban of the posting account(s)
3. Hash-matching to prevent re-upload
4. Preservation of account data for law enforcement

I have submitted / am submitting hashes to StopNCII.org and may be working with CCRI (cybercivilrights.org).

This is an emergency. Please escalate immediately.

Name: ${name}`,
  }),
  stalking: (name, platform, details) => ({
    subject: `Cyberstalking / Safety Threat Report — ${name}`,
    body: `To the Trust & Safety Team at ${platform},

My name is ${name}. I am reporting active cyberstalking on your platform that constitutes a threat to my personal safety.

${details ? `Details:\n${details}\n` : ''}
The behavior being reported violates your Terms of Service and federal cyberstalking law (18 U.S.C. § 2261A).

I am requesting:
1. Immediate account suspension of the stalker account(s)
2. Removal of all content targeting me
3. A no-contact enforcement mechanism
4. Preservation of logs and account data for law enforcement

I have reported this to local law enforcement and the FBI Internet Crime Complaint Center (ic3.gov).

Regards,
${name}`,
  }),
  impersonation: (name, platform, details) => ({
    subject: `Impersonation / Identity Fraud Report — ${name}`,
    body: `To the Trust & Safety Team at ${platform},

My name is ${name}. A fake account impersonating me has been created on your platform without my consent.

${details ? `Details:\n${details}\n` : ''}
This account is being used to damage my reputation, deceive people who know me, and/or solicit content or money in my name.

I am requesting:
1. Immediate removal of the impersonating account
2. Removal of all content posted under my identity
3. A case reference number for follow-up

Regards,
${name}`,
  }),
}

const STORAGE_KEY = 'phantom-platform-reporter-v1'

export function PlatformReporterTab() {
  const [yourName, setYourName] = useState(() => localStorage.getItem('phantom-your-name') ?? '')
  const [details, setDetails] = useState(() => localStorage.getItem('phantom-reporter-details') ?? '')
  const [category, setCategory] = useState<Category>('doxxing')
  const [reported, setReported] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(reported)) }, [reported])
  useEffect(() => { localStorage.setItem('phantom-your-name', yourName) }, [yourName])
  useEffect(() => { localStorage.setItem('phantom-reporter-details', details) }, [details])

  function markReported(name: string) {
    setReported(prev => ({ ...prev, [name]: true }))
  }

  function copyEmail(platform: Platform) {
    const { body } = TEMPLATES[category](yourName || 'Your Name', platform.name, details)
    navigator.clipboard.writeText(body)
    setCopied(platform.name + '-copy')
    setTimeout(() => setCopied(null), 2000)
  }

  function openMailto(platform: Platform) {
    if (!platform.trustEmail) return
    const { subject, body } = TEMPLATES[category](yourName || 'Your Name', platform.name, details)
    window.open(`mailto:${platform.trustEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    markReported(platform.name)
  }

  const reportedCount = Object.values(reported).filter(Boolean).length

  const CATEGORIES: { id: Category; label: string }[] = [
    { id: 'doxxing', label: 'Doxxing' },
    { id: 'harassment', label: 'Harassment' },
    { id: 'ncii', label: 'NCII' },
    { id: 'stalking', label: 'Stalking' },
    { id: 'impersonation', label: 'Impersonation' },
  ]

  return (
    <div className="space-y-5">
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Send className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Platform Reporter</h2>
            <p className="text-xs text-gray-500">Pre-written reports to every platform's trust & safety team</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{reportedCount} platforms reported</span>
            <span>{PLATFORMS.length - reportedCount} remaining</span>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{ width: `${Math.round((reportedCount / PLATFORMS.length) * 100)}%` }} />
          </div>
        </div>

        <input
          className="input-field mb-3"
          placeholder="Your name (used in report templates)"
          value={yourName}
          onChange={e => setYourName(e.target.value)}
        />
        <textarea
          className="input-field resize-none mb-4"
          rows={3}
          placeholder="Details: account URLs, usernames, post links, dates of incidents…"
          value={details}
          onChange={e => setDetails(e.target.value)}
        />

        {/* Category */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                category === c.id
                  ? 'bg-red-950/60 text-red-400 border-red-900/50'
                  : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-dark divide-y divide-gray-900">
        {PLATFORMS.map(platform => {
          const isDone = reported[platform.name]
          const isOpen = expanded === platform.name
          const { subject, body } = TEMPLATES[category](yourName || 'Your Name', platform.name, details)

          return (
            <div key={platform.name} className={isDone ? 'opacity-60' : ''}>
              <div className="flex items-center gap-3 p-4">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isDone ? 'bg-green-500' : 'bg-gray-700'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{platform.name}</span>
                    <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{platform.category}</span>
                  </div>
                  {platform.notes && <p className="text-[11px] text-gray-600 mt-0.5">{platform.notes}</p>}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setExpanded(isOpen ? null : platform.name)} className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                  <button onClick={() => copyEmail(platform)} className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                    {copied === platform.name + '-copy' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                  <a
                    href={platform.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markReported(platform.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isDone
                        ? 'bg-green-950/40 text-green-500 border border-green-900/40'
                        : 'btn-red'
                    }`}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {isDone ? 'Reported' : 'Report'}
                  </a>
                  {platform.trustEmail && (
                    <button
                      onClick={() => openMailto(platform)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200 transition-colors"
                    >
                      <Send className="h-3 w-3" />
                      Email
                    </button>
                  )}
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

      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/50 border border-gray-800">
        <AlertTriangle className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          Always file a police report and FBI IC3 complaint in parallel — platforms respond faster when law enforcement is involved. Keep your case reference numbers in the Evidence Tracker tab.
        </p>
      </div>
    </div>
  )
}
