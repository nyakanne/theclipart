import { useState } from 'react'
import { Fingerprint, Copy, Check, Hash, AlertTriangle, ExternalLink, Shield } from 'lucide-react'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface Hashed {
  id: string
  label: string
  input: string
  hash: string
  timestamp: string
}

const STORAGE_KEY = 'phantom-fingerprints-v1'

const PLATFORM_LINKS = [
  { name: 'StopNCII.org', url: 'https://stopncii.org', desc: 'Hash intimate images to block them across partner platforms (Meta, TikTok, Snap, Reddit, etc.)' },
  { name: 'NCMEC Take It Down', url: 'https://takeitdown.ncmec.org', desc: 'Remove CSAM and self-generated intimate images — minors only' },
  { name: 'Google Remove Results', url: 'https://support.google.com/websearch/troubleshooter/9685456', desc: 'Remove non-consensual intimate images from Google Search' },
  { name: 'Bing NCII Removal', url: 'https://www.microsoft.com/en-us/concern/bing', desc: 'Remove intimate images from Bing search results' },
  { name: 'Meta Safety Center', url: 'https://www.facebook.com/safety/sexual_exploitation', desc: 'Report NCII on Facebook and Instagram' },
  { name: 'CCRI Image Removal', url: 'https://cybercivilrights.org/online-removal/', desc: 'Platform-by-platform removal guide from Cyber Civil Rights Initiative' },
]

export function FingerprintTab() {
  const [input, setInput] = useState('')
  const [label, setLabel] = useState('')
  const [hashes, setHashes] = useState<Hashed[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function addHash() {
    if (!input.trim()) return
    setLoading(true)
    const hash = await sha256(input.trim())
    const entry: Hashed = {
      id: Math.random().toString(36).slice(2),
      label: label.trim() || 'Content',
      input: input.trim(),
      hash,
      timestamp: new Date().toLocaleString(),
    }
    const updated = [entry, ...hashes]
    setHashes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setInput('')
    setLabel('')
    setLoading(false)
  }

  function remove(id: string) {
    const updated = hashes.filter(h => h.id !== id)
    setHashes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function exportAll() {
    const text = hashes.map(h => `[${h.timestamp}] ${h.label}\nInput: ${h.input}\nSHA-256: ${h.hash}`).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied('all')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-900/30">
        <Shield className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-300 mb-1">Content Fingerprinting — How it works</p>
          <p className="text-xs text-red-300/70 leading-relaxed">
            A SHA-256 hash is a unique digital fingerprint of any text or content identifier. Platforms like StopNCII use hashes to detect and block non-consensual content <strong>without ever seeing the original</strong>.
            Hash a filename, URL, image description, or any unique identifier — then submit the hash to blocking programs.
          </p>
        </div>
      </div>

      {/* Hash generator */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Fingerprint className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Content Hash Generator</h2>
            <p className="text-xs text-gray-500">SHA-256 fingerprint your content identifiers locally — nothing leaves your device</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            className="input-field"
            placeholder="Label (e.g. 'profile photo 2023', 'leaked video filename')"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Paste a filename, URL, image description, or any unique content identifier to hash…"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button onClick={addHash} disabled={!input.trim() || loading} className="btn-red w-full justify-center">
            <Hash className="h-4 w-4" />
            {loading ? 'Hashing…' : 'Generate SHA-256 Hash'}
          </button>
        </div>
      </div>

      {/* Hash list */}
      {hashes.length > 0 && (
        <div className="card-dark divide-y divide-gray-900">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-xs font-semibold text-gray-400">{hashes.length} fingerprint{hashes.length !== 1 ? 's' : ''}</span>
            <button onClick={exportAll} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              {copied === 'all' ? <><Check className="h-3.5 w-3.5 text-red-400" /> Copied all</> : <><Copy className="h-3.5 w-3.5" /> Copy all</>}
            </button>
          </div>
          {hashes.map(h => (
            <div key={h.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">{h.label}</span>
                <span className="text-[10px] text-gray-700">{h.timestamp}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2 break-all">{h.input}</p>
              <div className="flex items-center gap-2 bg-gray-950 rounded-lg border border-gray-800 p-3">
                <code className="flex-1 text-xs text-red-400 font-mono break-all leading-relaxed">{h.hash}</code>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => copy(h.hash, h.id)} className="p-1.5 rounded border border-gray-800 hover:border-gray-700 transition-colors">
                    {copied === h.id ? <Check className="h-3 w-3 text-red-400" /> : <Copy className="h-3 w-3 text-gray-500" />}
                  </button>
                  <button onClick={() => remove(h.id)} className="p-1.5 rounded border border-gray-800 hover:border-red-900/50 transition-colors text-gray-600 hover:text-red-400">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hashes.length === 0 && (
        <div className="card-dark p-8 text-center">
          <Hash className="h-8 w-8 text-gray-800 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No fingerprints yet. Hash a content identifier above to get started.</p>
        </div>
      )}

      {/* StopNCII + platform links */}
      <div className="card-dark p-5">
        <h3 className="font-semibold text-white mb-1">Submit Hashes to Blocking Programs</h3>
        <p className="text-xs text-gray-500 mb-4">These platforms accept content hashes to proactively block distribution</p>
        <div className="space-y-3">
          {PLATFORM_LINKS.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
               className="flex items-start gap-3 p-3 rounded-xl border border-gray-800 bg-gray-900/30 hover:border-gray-700 transition-colors group">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.desc}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 mt-0.5 flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-900/50 border border-gray-800">
        <AlertTriangle className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          All hashing is done <strong className="text-gray-400">locally in your browser</strong>. No content or hashes are sent to Phantom servers.
          For the strongest protection, use StopNCII's official tool to hash actual image files — they use perceptual hashing which is more robust than text-based SHA-256.
        </p>
      </div>
    </div>
  )
}
