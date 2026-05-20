import { useState, useEffect, useRef } from 'react'
import { Search, ExternalLink, Copy, Check, AlertTriangle, Image, Trash2, Loader, RotateCcw, Zap, Upload, Link } from 'lucide-react'

interface SearchEntry {
  id: string; url: string; label: string; timestamp: string; notes: string
}

interface BingMatch {
  thumbnail: string | null
  page_url: string
  hostname: string
  name: string
  width?: number
  height?: number
}
interface BingResult {
  results: BingMatch[]
  total: number
}

// SauceNAO kept as fallback
interface SauceMatch {
  similarity: number; thumbnail: string | null; source: string | null
  all_urls: string[]; index: string; title: string; author: string
}
interface SauceResult {
  query_url: string; results: SauceMatch[]; total: number
}

interface Engine {
  name: string; description: string; category: string
  buildUrl: (imageUrl: string) => string; supportsUpload: boolean
  uploadUrl?: string; specialNote?: string
}

const ENGINES: Engine[] = [
  { name: 'Google Images',  description: 'Largest index — best for finding stolen photos and reposts across the web',           category: 'General',       buildUrl: url => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`,                                       supportsUpload: true,  uploadUrl: 'https://lens.google.com/',          specialNote: 'For private images, use Google Lens upload (no URL needed)' },
  { name: 'Yandex Images',  description: 'Often finds results Google misses — especially powerful for face matching',           category: 'General',       buildUrl: url => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`,                            supportsUpload: true,  uploadUrl: 'https://yandex.com/images/',        specialNote: 'Best face-match engine publicly available — use for headshots' },
  { name: 'Bing Visual',    description: 'Microsoft index — catches different results than Google',                             category: 'General',       buildUrl: url => `https://www.bing.com/images/search?view=detailv2&q=imgurl:${encodeURIComponent(url)}&iss=sbi`,              supportsUpload: true,  uploadUrl: 'https://www.bing.com/visualsearch' },
  { name: 'TinEye',         description: 'Specialist reverse image search — tracks exact copies and edited versions over time', category: 'Specialist',    buildUrl: url => `https://tineye.com/search?url=${encodeURIComponent(url)}`,                                                supportsUpload: true,  uploadUrl: 'https://tineye.com/',               specialNote: 'Best for tracking re-uploads and edited copies of stolen images' },
  { name: 'PimEyes',        description: 'Face recognition search — finds your face across billions of images',                category: 'Face Search',   buildUrl: () => 'https://pimeyes.com/',                                                                                      supportsUpload: true,  uploadUrl: 'https://pimeyes.com/',              specialNote: 'Upload only — paste the URL into PimEyes directly. Paid tier finds more results.' },
  { name: 'FaceCheck.ID',   description: 'Free face search across social media and public sites',                              category: 'Face Search',   buildUrl: () => 'https://facecheck.id/',                                                                                     supportsUpload: true,  uploadUrl: 'https://facecheck.id/',             specialNote: 'Free alternative to PimEyes — good for social profile matching' },
  { name: 'Shutterstock',   description: 'Check if your images were stolen and sold as stock photos',                          category: 'Content Theft', buildUrl: url => `https://www.shutterstock.com/search?searchterm=${encodeURIComponent(url)}&search_source=base_landing_page`, supportsUpload: false, uploadUrl: 'https://www.shutterstock.com/search' },
  { name: 'Getty Images',   description: "Check if your images appear in Getty's commercial database",                         category: 'Content Theft', buildUrl: () => 'https://www.gettyimages.com/',                                                                              supportsUpload: false, uploadUrl: 'https://www.gettyimages.com/' },
  { name: 'DMCA.com',       description: 'Find stolen content and file DMCA takedowns directly',                               category: 'DMCA',          buildUrl: () => 'https://www.dmca.com/Protection/Search.aspx',                                                               supportsUpload: false, uploadUrl: 'https://www.dmca.com/',             specialNote: "Use this to file takedowns once you've found stolen content" },
  { name: 'Reddit Search',  description: 'Find reposts of your images on Reddit',                                              category: 'Social',        buildUrl: url => `https://www.reddit.com/search/?q=url:${encodeURIComponent(url)}&type=link`,                               supportsUpload: false },
]

const STORAGE_KEY = 'vindica-reverse-image-v1'
const CATEGORY_COLORS: Record<string, string> = {
  'General': 'bg-red-950/40 text-red-400', 'Specialist': 'bg-red-950/40 text-red-400',
  'Face Search': 'bg-red-950/40 text-red-400', 'Content Theft': 'bg-red-950/40 text-red-400',
  'DMCA': 'bg-red-950/40 text-red-400', 'Social': 'bg-gray-800 text-gray-400',
}

export function ReverseImageTab() {
  const [mode, setMode]           = useState<'url' | 'upload'>('url')
  const [imageUrl, setImageUrl]   = useState('')
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [label, setLabel]         = useState('')
  const [notes, setNotes]         = useState('')
  const [searches, setSearches]   = useState<SearchEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
  })
  const [launched, setLaunched]           = useState<Set<string>>(new Set())
  const [copied, setCopied]               = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [dragging, setDragging]           = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Bing Visual Search state (primary — real people)
  const [bingLoading, setBingLoading] = useState(false)
  const [bingResult, setBingResult]   = useState<BingResult | null>(null)
  const [bingError, setBingError]     = useState('')

  // SauceNAO state (fallback — art/stock/anime)
  const [sauceLoading, setSauceLoading] = useState(false)
  const [sauceResult, setSauceResult]   = useState<SauceResult | null>(null)
  const [sauceError, setSauceError]     = useState('')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(searches)) }, [searches])

  function pickFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
    setBingResult(null); setSauceResult(null); setBingError(''); setSauceError('')
  }

  function saveSearch() {
    const entry: SearchEntry = {
      id: Math.random().toString(36).slice(2),
      url: imageUrl.trim() || (file?.name ?? 'uploaded file'),
      label: label.trim() || 'Image search',
      timestamp: new Date().toLocaleString(),
      notes: notes.trim(),
    }
    setSearches(prev => [entry, ...prev])
    setLabel(''); setNotes('')
  }

  function launchAll(url: string) {
    filteredEngines.forEach((engine, i) => {
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

  function resetSearch() {
    setBingResult(null); setSauceResult(null); setBingError(''); setSauceError('')
    setFile(null); setPreview(null)
  }

  async function runBingSearch() {
    setBingLoading(true); setBingResult(null); setBingError(''); setSauceResult(null)
    try {
      const body = new FormData()
      if (file) {
        body.append('file', file)
      } else if (imageUrl.trim()) {
        body.append('image_url', imageUrl.trim())
      } else {
        setBingError('Paste a URL or upload an image first'); setBingLoading(false); return
      }
      const r = await fetch('/api/v1/osint/visual-search', { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) { setBingError(d.detail ?? `Error ${r.status}`); return }
      setBingResult(d)
    } catch {
      setBingError('Search failed — check your connection')
    } finally {
      setBingLoading(false)
    }
  }

  async function runSauceSearch() {
    const u = imageUrl.trim()
    if (!u) { setSauceError('SauceNAO requires a public image URL'); return }
    setSauceLoading(true); setSauceResult(null); setSauceError('')
    try {
      const r = await fetch(`/api/v1/osint/reverse-image?url=${encodeURIComponent(u)}`)
      const d = await r.json()
      if (r.status === 429) { setSauceError('Daily limit reached (100/day free). Try again tomorrow.'); return }
      if (!r.ok) { setSauceError(d.detail ?? `Error ${r.status}`); return }
      setSauceResult(d)
    } catch {
      setSauceError('SauceNAO search failed')
    } finally {
      setSauceLoading(false)
    }
  }

  const categories = ['All', ...Array.from(new Set(ENGINES.map(e => e.category)))]
  const filteredEngines = activeCategory === 'All' ? ENGINES : ENGINES.filter(e => e.category === activeCategory)
  const hasInput = !!(imageUrl.trim() || file)

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card-dark p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[0.15em] text-red-500 uppercase">Image Trace & Takedown</span>
          <span className="h-px w-12 bg-red-900/50" />
        </div>
        <h1 className="text-2xl font-black text-white leading-tight mb-1">Find Every Copy.</h1>
        <h2 className="text-2xl font-black text-red-500 leading-tight mb-3">Remove Them All.</h2>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed">
          In-app reverse search via Bing Visual Search (Azure) — paste a URL or upload an image file. Results for real people, right here.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-900/30">
        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-300 mb-1">Real-Web Reverse Image Search</p>
          <p className="text-xs text-red-300/70 leading-relaxed">
            <strong className="text-red-300">Search In-App</strong> uses Bing Visual Search (Azure, 3,000/month free) to find real web pages where this image appears.
            Supports both URL and file upload. For face matching use Yandex or PimEyes in the engine grid.
          </p>
        </div>
      </div>

      {/* Input card */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Search className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Reverse Image Search</h2>
            <p className="text-xs text-gray-500">Paste a URL or upload a file — results shown in-app</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setMode('url'); setFile(null); setPreview(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${mode === 'url' ? 'bg-red-950/50 text-red-400 border-red-900/40' : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}>
            <Link className="h-3.5 w-3.5" /> Image URL
          </button>
          <button onClick={() => setMode('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${mode === 'upload' ? 'bg-red-950/50 text-red-400 border-red-900/40' : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}>
            <Upload className="h-3.5 w-3.5" /> Upload File
          </button>
        </div>

        <div className="space-y-3">
          <input className="input-field" placeholder="Label (e.g. 'profile photo', 'leaked headshot')"
            value={label} onChange={e => setLabel(e.target.value)} />

          {mode === 'url' ? (
            <div className="flex gap-2">
              <input className="input-field flex-1" placeholder="Paste public image URL (https://…)"
                value={imageUrl} onChange={e => { setImageUrl(e.target.value); resetSearch() }} />
              <button onClick={copyUrl} disabled={!imageUrl}
                className="p-2.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors flex-shrink-0">
                {copied ? <Check className="h-4 w-4 text-red-400" /> : <Copy className="h-4 w-4 text-gray-500" />}
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragging ? 'border-red-600 bg-red-950/20' : 'border-gray-800 hover:border-gray-700 bg-gray-900/20'}`}
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
              {preview ? (
                <div className="flex items-center gap-3">
                  <img src={preview} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm text-white font-medium">{file?.name}</p>
                    <p className="text-xs text-gray-500">{file ? (file.size / 1024).toFixed(0) + ' KB' : ''}</p>
                    <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); resetSearch() }}
                      className="text-xs text-red-500 hover:text-red-400 mt-1 transition-colors">Remove</button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Drop an image here or click to browse</p>
                  <p className="text-xs text-gray-700 mt-1">JPEG / PNG · max 4 MB</p>
                </>
              )}
            </div>
          )}

          <textarea className="input-field resize-none" rows={2}
            placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={bingResult ? resetSearch : runBingSearch}
              disabled={!hasInput && !bingResult}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
            >
              {bingLoading ? <Loader className="h-4 w-4 animate-spin" /> : bingResult ? <RotateCcw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {bingLoading ? 'Searching…' : bingResult ? 'New Search' : 'Search In-App'}
            </button>
            {mode === 'url' && imageUrl.trim() && (
              <button onClick={runSauceSearch} disabled={sauceLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-40">
                {sauceLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                SauceNAO
              </button>
            )}
            <button onClick={saveSearch} disabled={!hasInput}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-40">
              <Image className="h-4 w-4" /> Save & Track
            </button>
            {mode === 'url' && imageUrl.trim() && (
              <button onClick={() => launchAll(imageUrl)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
                <ExternalLink className="h-4 w-4" /> Launch All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bing Visual Search results ──────────────────────────────────────── */}
      {bingError && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400 font-mono">! {bingError}</div>
      )}

      {bingResult && (
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-red-500" />
            <span className="text-sm font-bold text-white">Bing Visual Search</span>
            <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">{bingResult.total} match{bingResult.total !== 1 ? 'es' : ''}</span>
            <span className="text-[10px] text-gray-600 ml-auto">Azure · 3,000/mo free</span>
          </div>
          {bingResult.total === 0 ? (
            <p className="text-center py-6 text-gray-600 text-sm">No matches found on the web for this image</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bingResult.results.map((m, i) => (
                <a key={i} href={m.page_url} target="_blank" rel="noopener noreferrer"
                  className="flex gap-3 p-3 rounded-xl border border-gray-800/80 bg-gray-900/30 hover:border-gray-700 transition-colors group">
                  {m.thumbnail && (
                    <img src={m.thumbnail} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    {m.name && <p className="text-xs text-white font-medium mb-1 line-clamp-2">{m.name}</p>}
                    <p className="text-[10px] text-red-400 font-mono truncate">{m.hostname}</p>
                    {m.width && m.height && <p className="text-[10px] text-gray-600 mt-0.5">{m.width}×{m.height}</p>}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 self-start mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SauceNAO results (secondary) ───────────────────────────────────── */}
      {sauceError && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400 font-mono">! {sauceError}</div>
      )}

      {sauceResult && (
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-bold text-white">SauceNAO Results</span>
            <span className="text-[10px] bg-gray-800 text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">{sauceResult.total} match{sauceResult.total !== 1 ? 'es' : ''}</span>
            <span className="text-[10px] text-gray-600 ml-auto">Free · 100/day</span>
          </div>
          {sauceResult.total === 0 ? (
            <p className="text-center py-6 text-gray-600 text-sm">No matches above 40% similarity</p>
          ) : (
            <div className="space-y-3">
              {sauceResult.results.map((match, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl border border-gray-800/80 bg-gray-900/30">
                  {match.thumbnail && <img src={match.thumbnail} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-800" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-lg font-black ${match.similarity >= 85 ? 'text-red-400' : match.similarity >= 60 ? 'text-yellow-500' : 'text-gray-400'}`}>{match.similarity}%</span>
                      <span className="text-[10px] text-gray-600 font-mono">{match.index}</span>
                    </div>
                    {match.title && <p className="text-xs text-white font-medium mb-1 truncate">{match.title}</p>}
                    {match.author && <p className="text-[10px] text-gray-500 mb-1">by {match.author}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {match.all_urls.slice(0, 3).map(u => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-mono truncate max-w-[180px]">
                          <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                          {new URL(u).hostname}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeCategory === cat ? 'bg-red-950/60 text-red-400 border-red-900/50' : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
            }`}>{cat}</button>
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
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white">{engine.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[engine.category] ?? 'bg-gray-800 text-gray-400'}`}>{engine.category}</span>
                    {isLaunched && <span className="text-[10px] text-red-400">Launched</span>}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{engine.description}</p>
                  {engine.specialNote && <p className="text-[11px] text-red-400/80 mt-1 leading-relaxed">{engine.specialNote}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <a href={href} target="_blank" rel="noopener noreferrer"
                  onClick={() => setLaunched(prev => new Set([...prev, engine.name]))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-900 border border-gray-700 hover:border-gray-600 text-xs font-semibold text-white transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> {url ? 'Search' : 'Upload'}
                </a>
                {engine.supportsUpload && engine.uploadUrl && (
                  <a href={engine.uploadUrl} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 text-xs text-gray-500 hover:text-gray-300 transition-colors">Upload</a>
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
            <button onClick={() => { setSearches([]); localStorage.removeItem(STORAGE_KEY) }}
              className="text-xs text-gray-700 hover:text-red-400 transition-colors">Clear all</button>
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
                <button onClick={() => { setImageUrl(s.url); setMode('url'); resetSearch() }}
                  className="text-xs text-red-500 hover:text-red-400 mt-1 transition-colors">Load into search</button>
              </div>
              <button onClick={() => setSearches(prev => prev.filter(x => x.id !== s.id))}
                className="p-1.5 rounded hover:bg-gray-800 transition-colors flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5 text-gray-700 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
