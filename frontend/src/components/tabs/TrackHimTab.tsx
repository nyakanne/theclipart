import { useState } from 'react'
import { Plus, Trash2, ExternalLink, Copy, Check, AlertTriangle, Shield, Clock, Link, FileText, User } from 'lucide-react'

interface EvidenceEntry {
  id: string
  type: 'account' | 'url' | 'timeline' | 'report' | 'note' | 'screenshot'
  content: string
  label: string
  timestamp: string
}

const TYPE_CONFIG = {
  account:    { label: 'Account / Handle', icon: User,     color: 'text-blue-400',   bg: 'bg-blue-950/30 border-blue-900/40' },
  url:        { label: 'URL / Link',        icon: Link,     color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-900/40' },
  timeline:   { label: 'Timeline Event',    icon: Clock,    color: 'text-orange-400', bg: 'bg-orange-950/30 border-orange-900/40' },
  report:     { label: 'Report Number',     icon: FileText, color: 'text-green-400',  bg: 'bg-green-950/30 border-green-900/40' },
  note:       { label: 'Case Note',         icon: FileText, color: 'text-gray-400',   bg: 'bg-gray-900/50 border-gray-800' },
  screenshot: { label: 'Screenshot URL',    icon: ExternalLink, color: 'text-yellow-400', bg: 'bg-yellow-950/30 border-yellow-900/40' },
}

const REPORT_LINKS = [
  { name: 'FBI IC3', url: 'https://www.ic3.gov/', desc: 'Internet crime / cyberstalking' },
  { name: 'FTC Report Fraud', url: 'https://reportfraud.ftc.gov/', desc: 'Deceptive / abusive business practices' },
  { name: 'CCRI Helpline', url: 'https://cybercivilrights.org/get-help/', desc: 'Non-consensual image abuse support' },
  { name: 'NCMEC CyberTipline', url: 'https://www.missingkids.org/gethelpnow/cybertipline', desc: 'Child exploitation reports' },
  { name: 'Platform Report Tools', url: 'https://cybercivilrights.org/online-removal/', desc: 'All platform removal links' },
  { name: 'State Cyberstalking Laws', url: 'https://victimsofcrime.org/cyberstalking-laws/', desc: 'Find your state\'s law' },
]

function exportCase(entries: EvidenceEntry[], subjectName: string): string {
  const date = new Date().toLocaleString()
  const byType = (type: string) => entries.filter(e => e.type === type)
  return `DATAGUARD ACTOR EVIDENCE RECORD
Subject: ${subjectName || '[UNNAMED SUBJECT]'}
Exported: ${date}
Total entries: ${entries.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${Object.keys(TYPE_CONFIG).filter(t => byType(t).length > 0).map(t => {
  const items = byType(t)
  return `${TYPE_CONFIG[t as keyof typeof TYPE_CONFIG].label.toUpperCase()} (${items.length})\n${items.map(i =>
    `  [${i.timestamp}] ${i.label ? i.label + ': ' : ''}${i.content}`
  ).join('\n')}`
}).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOR LAW ENFORCEMENT / ATTORNEY USE ONLY
This record documents known accounts, public URLs, and reported incidents.
It does not contain private location data, credentials, or private communications.
`
}

export function TrackHimTab() {
  const [subjectName, setSubjectName] = useState('')
  const [entries, setEntries] = useState<EvidenceEntry[]>([])
  const [newType, setNewType] = useState<keyof typeof TYPE_CONFIG>('account')
  const [newLabel, setNewLabel] = useState('')
  const [newContent, setNewContent] = useState('')
  const [copied, setCopied] = useState(false)

  function addEntry() {
    if (!newContent.trim()) return
    setEntries(prev => [
      {
        id: Math.random().toString(36).slice(2),
        type: newType,
        label: newLabel.trim(),
        content: newContent.trim(),
        timestamp: new Date().toLocaleString(),
      },
      ...prev,
    ])
    setNewContent('')
    setNewLabel('')
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function copyExport() {
    navigator.clipboard.writeText(exportCase(entries, subjectName))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-5">
      {/* Safety notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-950/20 border border-orange-900/30">
        <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-300 mb-1">Evidence Tracker — Not a Surveillance Tool</p>
          <p className="text-xs text-orange-300/70 leading-relaxed">
            This tool is for documenting <strong>known public accounts, URLs, report numbers, and case notes</strong> to share with law enforcement or attorneys.
            Do not record private location data, credentials, personal communications, or information obtained through unauthorized access.
            Physical surveillance, hacking, or doxxing is not supported and is illegal.
          </p>
        </div>
      </div>

      {/* Subject */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Shield className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Actor Evidence Tracker</h2>
            <p className="text-xs text-gray-500">Document known accounts, incidents, and reports for law enforcement</p>
          </div>
        </div>
        <input
          className="input-field"
          placeholder="Subject name or reference (stays local only)"
          value={subjectName}
          onChange={e => setSubjectName(e.target.value)}
        />
      </div>

      {/* Add entry */}
      <div className="card-dark p-5">
        <h3 className="font-semibold text-white text-sm mb-3">Add Evidence Entry</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map(t => (
            <button
              key={t}
              onClick={() => setNewType(t)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                newType === t
                  ? TYPE_CONFIG[t].bg + ' ' + TYPE_CONFIG[t].color
                  : 'border-gray-800 text-gray-600 hover:border-gray-700'
              }`}
            >
              {(() => { const Icon = TYPE_CONFIG[t].icon; return <Icon className="h-3.5 w-3.5" /> })()}
              {TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-2">
          <input
            className="input-field w-36"
            placeholder="Label (optional)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <input
            className="input-field flex-1"
            placeholder={
              newType === 'account' ? '@username or platform/handle'
              : newType === 'url' ? 'https://...'
              : newType === 'timeline' ? 'Date and description of incident'
              : newType === 'report' ? 'Report number / case reference'
              : newType === 'screenshot' ? 'URL to screenshot (Drive, Imgur, etc)'
              : 'Case note text'
            }
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addEntry()}
          />
          <button onClick={addEntry} className="btn-red flex-shrink-0">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Entries */}
      {entries.length > 0 ? (
        <div className="card-dark divide-y divide-gray-900">
          {entries.map(entry => {
            const cfg = TYPE_CONFIG[entry.type]
            return (
              <div key={entry.id} className="flex items-start gap-3 p-4">
                <div className={`rounded-lg border p-1.5 flex-shrink-0 ${cfg.bg}`}>
                  <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold uppercase ${cfg.color}`}>{cfg.label}</span>
                    {entry.label && <span className="text-[10px] text-gray-500">{entry.label}</span>}
                    <span className="text-[10px] text-gray-700 ml-auto">{entry.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-300 break-all leading-relaxed">{entry.content}</p>
                  {entry.type === 'url' || entry.type === 'screenshot' ? (
                    <a href={entry.content} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
                      <ExternalLink className="h-3 w-3" /> Open link
                    </a>
                  ) : null}
                </div>
                <button onClick={() => removeEntry(entry.id)} className="p-1.5 rounded hover:bg-gray-800 transition-colors flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5 text-gray-600 hover:text-red-400" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-dark p-8 text-center">
          <Shield className="h-8 w-8 text-gray-800 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No evidence entries yet. Add known accounts, URLs, incidents, or report numbers above.</p>
        </div>
      )}

      {/* Export */}
      {entries.length > 0 && (
        <div className="card-dark p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-sm">Export Case File</h3>
              <p className="text-xs text-gray-500 mt-0.5">{entries.length} entries · for law enforcement or attorney use</p>
            </div>
            <button onClick={copyExport} className="btn-red">
              {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Case File</>}
            </button>
          </div>
        </div>
      )}

      {/* Authority links */}
      <div className="card-dark p-5">
        <h3 className="font-semibold text-white mb-4">Report to Authorities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPORT_LINKS.map(l => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 p-3 rounded-xl border border-gray-800 bg-gray-900/30 hover:border-gray-700 transition-colors group">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{l.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{l.desc}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
