import { useState, useEffect } from 'react'
import { Search, ExternalLink, Copy, Check, AlertTriangle, Image, Trash2 } from 'lucide-react'

interface SearchEntry {
  id: string
  url: string
  label: string
  timestamp: string
  notes: string
}

interface Engine {
  name: string
  description: string
  category: string
  buildUrl: (imageUrl: string) => string
  supportsUpload: boolean
  uploadUrl?: string
  specialNote?: string
}

const ENGINES: Engine[] = [
  {
    name: 'Google Images',
    description: 'Largest index — best for finding stolen photos and reposts across the web',
    category: 'General',
    buildUrl: url => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`,
    supportsUpload: true,
    uploadUrl: 'https://lens.google.com/',
    specialNote: 'For private images, use Google Lens upload (no URL needed)',
  },
  {
    name: 'Yandex Images',
    description: 'Often finds results Google misses — especially powerful for face matching',
    category: 'General',
    buildUrl: url => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`,
    supportsUpload: true,
    uploadUrl: 'https://yandex.com/images/',
    specialNote: 'Best face-match engine available publicly — use this first for headshots',
  },
  {
    name: 'Bing Visual Search',
    description: 'Microsoft index — catches different results than Google',
    category: 'General',
    buildUrl: url => `https://www.bing.com/images/search?view=detailv2&q=imgurl:${encodeURIComponent(url)}&iss=sbi`,
    supportsUpload: true,
    uploadUrl: 'https://www.bing.com/visualsearch',
  },
  {
    name: 'TinEye',
    description: 'Specialist reverse image search — tracks exact copies and edited versions over time',
    category: 'Specialist',
    buildUrl: url => `https://tineye.com/search?url=${encodeURIComponent(url)}`,
    supportsUpload: true,
    uploadUrl: 'https://tineye.com/',
    specialNote: 'Best for tracking re-uploads and edited copies of stolen images',
  },
  {
    name: 'PimEyes',
    description: 'Face recognition search — finds your face across billions of images',
    category: 'Face Search',
    buildUrl: () => 'https://pimeyes.com/',
    supportsUpload: true,
    uploadUrl: 'https://pimeyes.com/',
    specialNote: 'Upload only — paste the URL into PimEyes directly. Paid tier finds more results.',
  },
  {
    name: 'FaceCheck.ID',
    description: 'Free face search across social media and public sites',
    category: 'Face Search',
    buildUrl: () => 'https://facecheck.id/',
    supportsUpload: true,
    uploadUrl: 'https://facecheck.id/',
    specialNote: 'Free alternative to PimEyes — good for social profile matching',
  },
  {
    name: 'Shutterstock',
    description: 'Check if your images were stolen and sold as stock photos',
    category: 'Content Theft',
    buildUrl: url => `https://www.shutterstock.com/search?searchterm=${encodeURIComponent(url)}&search_source=base_landing_page`,
    supportsUpload: false,
    uploadUrl: 'https://www.shutterstock.com/search',
    specialNote: 'Search for your name or upload to check for stolen/sold content',
  },
  {
    name: 'Getty Images',
    description: 'Check if your images appear in Getty\'s commercial database',
    category: 'Content Theft',
    buildUrl: () => 'https://www.gettyimages.com/',
    supportsUpload: false,
    uploadUrl: 'https://www.gettyimages.com/',
  },
  {
    name: 'DMCA.com Search',
    description: 'Find stolen content and file DMCA takedowns directly',
    category: 'DMCA',
    buildUrl: () => 'https://www.dmca.com/Protection/Search.aspx',
    supportsUpload: false,
    uploadUrl: 'https://www.dmca.com/',
    specialNote: 'Use this to file takedowns once you\'ve found stolen content',
  },
  {
    name: 'Reddit Image Search',
    description: 'Find reposts of your images on Reddit',
    category: 'Social',
    buildUrl: url => `https://www.reddit.com/search/?q=url:${encodeURIComponent(url)}&type=link`,
    supportsUpload: false,
  },
]

const STORAGE_KEY = 'phantom-reverse-image-v1'

const CATEGORY_COLORS: Record<string, string> = {
  'General':       'bg-red-950/40 text-red-400',
  'Specialist':    'bg-red-950/40 text-red-400',
  'Face Search':   'bg-red-950/40 text-red-400',
  'Content Theft': 'bg-red-950/40 text-orange-400',
  'DMCA':          'bg-green-950/40 text-green-400',
  'Social':        'bg-gray-800 text-gray-400',
}

export function ReverseImageTab() {
  const [imageUrl, setImageUrl] = useState('')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [searches, setSearches] = useState<SearchEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
  })
  const [launched, setLaunched] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('All')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(searches)) }, [searches])

  function saveSearch() {
    if (!imageUrl.trim()) return
    const entry: SearchEntry = {
      id: Math.random().toString(36).slice(2),
      url: imageUrl.trim(),
      label: label.trim() || 'Image search',
      timestamp: new Date().toLocaleString(),
      notes: notes.trim(),
    }
    setSearches(prev => [entry, ...prev])
    setLabel('')
    setNotes('')
  }

  function launchAll(url: string) {
    const toOpen = filteredEngines.filter(e => e.buildUrl(url) !== url)
    toOpen.forEach((engine, i) => {
      setTimeout(() => {
        window.open(engine.supportsUpload && !url ? engine.uploadUrl : engine.buildUrl(url), '_blank')
        setLaunched(prev => new Set([...prev, engine.name]))
      }, i * 400)
    })
  }

  function copyUrl() {
    navigator.clipboard.writeText(imageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categories = ['All', ...Array.from(new Set(ENGINES.map(e => e.category)))]
  const filteredEngines = activeCategory === 'All' ? ENGINES : ENGINES.filter(e => e.category === activeCategory)

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-900/30">
        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-300 mb-1">Reverse Image Search — Find Stolen Content</p>
          <p className="text-xs text-red-300/70 leading-relaxed">
            Paste a public URL to your image and launch searches across all engines simultaneously.
            For private or local images, use the upload option on each engine directly.
            <strong className="text-red-300"> Yandex and PimEyes are most effective for face matching.</strong>
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Search className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Reverse Image Search</h2>
            <p className="text-xs text-gray-500">Find where your images appear across {ENGINES.length} search engines</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            className="input-field"
            placeholder="Label (e.g. 'profile photo', 'leaked headshot')"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="Paste public image URL (https://…) or use upload on each engine for private images"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
            <button onClick={copyUrl} disabled={!imageUrl} className="p-2.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors flex-shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-500" />}
            </button>
          </div>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder="Notes (optional — what you're looking for, where you found it)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={saveSearch} disabled={!imageUrl.trim()} className="btn-red">
              <Image className="h-4 w-4" /> Save & Track
            </button>
            <button
              onClick={() => launchAll(imageUrl)}
              disabled={!imageUrl.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> Launch All Engines
            </button>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeCategory === cat
                ? 'bg-red-950/60 text-red-400 border-red-900/50'
                : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Engine grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredEngines.map(engine => {
          const isLaunched = launched.has(engine.name)
          const url = imageUrl.trim()
          const href = url ? engine.buildUrl(url) : (engine.uploadUrl ?? '#')

          return (
            <div key={engine.name} className={`card-dark p-4 transition-colors ${isLaunched ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white">{engine.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[engine.category] ?? 'bg-gray-800 text-gray-400'}`}>
                      {engine.category}
                    </span>
                    {isLaunched && <span className="text-[10px] text-green-500">Launched</span>}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{engine.description}</p>
                  {engine.specialNote && (
                    <p className="text-[11px] text-orange-400/80 mt-1 leading-relaxed">{engine.specialNote}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setLaunched(prev => new Set([...prev, engine.name]))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-900 border border-gray-700 hover:border-gray-600 text-xs font-semibold text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {url ? 'Search' : 'Upload'}
                </a>
                {engine.supportsUpload && engine.uploadUrl && (
                  <a
                    href={engine.uploadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Upload
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Search history */}
      {searches.length > 0 && (
        <div className="card-dark divide-y divide-gray-900">
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-xs font-semibold text-gray-400">Search History</h3>
            <button
              onClick={() => { setSearches([]); localStorage.removeItem(STORAGE_KEY) }}
              className="text-xs text-gray-700 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>
          {searches.map(s => (
            <div key={s.id} className="flex items-start gap-3 p-4">
              <Image className="h-4 w-4 text-gray-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">{s.label}</span>
                  <span className="text-[10px] text-gray-700 ml-auto">{s.timestamp}</span>
                </div>
                <p className="text-xs text-gray-600 break-all">{s.url}</p>
                {s.notes && <p className="text-xs text-gray-500 mt-1">{s.notes}</p>}
                <button
                  onClick={() => { setImageUrl(s.url); setLabel(s.label) }}
                  className="text-xs text-red-500 hover:text-red-400 mt-1 transition-colors"
                >
                  Load into search
                </button>
              </div>
              <button
                onClick={() => setSearches(prev => prev.filter(x => x.id !== s.id))}
                className="p-1.5 rounded hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5 text-gray-700 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
