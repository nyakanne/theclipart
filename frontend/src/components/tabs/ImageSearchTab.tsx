import { useState, useRef } from 'react'
import { ExternalLink, Image, AlertTriangle, Upload, Link, Loader, RotateCcw, Zap, User, Tag, Eye } from 'lucide-react'

interface CvResult {
  caption: string
  caption_confidence: number
  face_count: number
  celebrities: { name: string; confidence: number }[]
  tags: { name: string; confidence: number }[]
  objects: { name: string; confidence: number }[]
  dominant_colors: string[]
  adult_content: boolean
  metadata: { width?: number; height?: number; format?: string }
  provider?: 'huggingface' | 'azure'
}

const SEARCH_TOOLS = [
  {
    category: 'Facial Recognition',
    warning: true,
    warningText: 'These tools use facial recognition. Only use images you have rights to search.',
    items: [
      { name: 'PimEyes',              desc: 'AI-powered facial recognition search across the public web.',         url: 'https://pimeyes.com',                                             note: 'Paid — most comprehensive',        power: 'high'       },
      { name: 'FaceCheck.ID',         desc: 'Free face search engine for finding photos online.',                  url: 'https://facecheck.id',                                            note: 'Free tier available',              power: 'medium'     },
      { name: 'Search4Faces',         desc: 'Reverse face search via social media.',                              url: 'https://search4faces.com',                                        note: 'Russia/VK focused',                power: 'medium'     },
      { name: 'Clearview AI (opt-out)',desc: "Remove yourself from Clearview's database.",                         url: 'https://privacycompliance.clearview.ai/',                         note: 'Opt-out only',                     power: 'optout'     },
    ],
  },
  {
    category: 'Reverse Image Search',
    warning: false,
    items: [
      { name: 'Google Lens',          desc: "Google's image search — finds visually similar images across the web.", url: 'https://lens.google.com',                                       note: 'Upload or paste URL',              power: 'high'       },
      { name: 'TinEye',               desc: 'Finds exact and modified copies of an image across the web.',         url: 'https://tineye.com',                                              note: 'Exact match specialist',           power: 'high'       },
      { name: 'Yandex Images',        desc: 'Russian search engine with strong facial recognition matching.',      url: 'https://yandex.com/images/',                                      note: 'Strong for portraits',             power: 'high'       },
      { name: 'Bing Visual Search',   desc: "Microsoft's reverse image and visual search.",                        url: 'https://www.bing.com/visualsearch',                               note: 'Good for product/face search',     power: 'medium'     },
    ],
  },
  {
    category: 'NCII / Image Abuse Reporting',
    warning: false,
    items: [
      { name: 'StopNCII',             desc: 'Hash your intimate images to prevent them spreading across platforms.', url: 'https://stopncii.org',                                          note: 'Prevent distribution globally',    power: 'protection' },
      { name: 'Take It Down (NCMEC)', desc: 'Remove non-consensual intimate images. US NCMEC service.',            url: 'https://takeitdown.ncmec.org',                                    note: 'US-focused, free',                 power: 'protection' },
      { name: 'CCRI',                 desc: 'Support + resources for NCII victims. Removal assistance.',           url: 'https://cybercivilrights.org',                                    note: 'Advocacy + resources',             power: 'protection' },
      { name: 'Google Image Removal', desc: 'Request removal of non-consensual intimate images from Google.',      url: 'https://support.google.com/websearch/troubleshooter/9685456',    note: 'Direct Google removal',            power: 'protection' },
      { name: 'Meta NCII Reporting',  desc: 'Report non-consensual intimate images on Facebook and Instagram.',    url: 'https://www.facebook.com/help/contact/260749603972907',           note: 'Facebook/Instagram',               power: 'protection' },
    ],
  },
]

const POWER_BADGE: Record<string, string> = {
  high:       'bg-red-950/50 text-red-400 border-red-900/40',
  medium:     'bg-red-950/40 text-red-400 border-red-900/40',
  optout:     'bg-red-950/40 text-red-400 border-red-900/40',
  protection: 'bg-red-950/40 text-red-400 border-red-900/40',
}
const POWER_LABEL: Record<string, string> = {
  high: 'High Power', medium: 'Medium', optout: 'Opt-Out', protection: 'Protection',
}

export function ImageSearchTab() {
  const [mode, setMode]         = useState<'url' | 'upload'>('url')
  const [imageUrl, setImageUrl] = useState('')
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<CvResult | null>(null)
  const [error, setError]       = useState('')

  function pickFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
    setResult(null); setError('')
  }

  function reset() { setResult(null); setError(''); setFile(null); setPreview(null) }

  async function runAnalysis() {
    setLoading(true); setResult(null); setError('')
    try {
      const body = new FormData()
      if (file) {
        body.append('file', file)
      } else if (imageUrl.trim()) {
        body.append('image_url', imageUrl.trim())
      } else {
        setError('Paste a URL or upload an image first')
        setLoading(false)
        return
      }
      const r = await fetch('/api/v1/osint/analyze-image', { method: 'POST', body })
      const d = await r.json()
      if (!r.ok) { setError(d.detail ?? `Error ${r.status}`); return }
      setResult(d)
    } catch {
      setError('Analysis failed — check your connection')
    } finally {
      setLoading(false)
    }
  }

  const hasInput = !!(imageUrl.trim() || file)

  function buildSearchUrl(item: { url: string; name: string }) {
    if (!imageUrl.trim()) return item.url
    if (item.name === 'Google Lens')        return `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`
    if (item.name === 'TinEye')             return `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`
    if (item.name === 'Yandex Images')      return `https://yandex.com/images/search?img_url=${encodeURIComponent(imageUrl)}&rpt=imageview`
    if (item.name === 'Bing Visual Search') return `https://www.bing.com/images/search?view=detailv2&q=imgurl:${encodeURIComponent(imageUrl)}&iss=sbi`
    return item.url
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card-dark p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[0.15em] text-red-500 uppercase">Image Threat Detection</span>
          <span className="h-px w-12 bg-red-900/50" />
        </div>
        <h1 className="text-2xl font-black text-white leading-tight mb-1">Your Face.</h1>
        <h2 className="text-2xl font-black text-red-500 leading-tight mb-3">Everywhere It Shouldn't Be.</h2>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed">
          AI-powered image analysis in-app — scene description, face count, object detection, content tags. Free via Hugging Face, or upgrade to Azure for celebrity identification.
        </p>
      </div>

      {/* Input card */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Image className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Analyze Image In-App</h2>
            <p className="text-xs text-gray-500">Hugging Face (free) · Azure CV fallback if configured</p>
          </div>
        </div>

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

        {mode === 'url' ? (
          <input className="input-field mb-4"
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
            onChange={e => { setImageUrl(e.target.value); reset() }} />
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f) }}
            onClick={() => fileRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors mb-4 ${dragging ? 'border-red-600 bg-red-950/20' : 'border-gray-800 hover:border-gray-700 bg-gray-900/20'}`}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
            {preview ? (
              <div className="flex items-center gap-3">
                <img src={preview} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm text-white font-medium">{file?.name}</p>
                  <p className="text-xs text-gray-500">{file ? (file.size / 1024).toFixed(0) + ' KB' : ''}</p>
                  <button onClick={e => { e.stopPropagation(); reset() }}
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

        <button
          onClick={result ? reset : runAnalysis}
          disabled={!hasInput && !result}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
        >
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : result ? <RotateCcw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          {loading ? 'Analyzing…' : result ? 'New Analysis' : 'Analyze In-App'}
        </button>

        {error && <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400 font-mono">! {error}</div>}
      </div>

      {/* ── Azure CV Results ─────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4">
          {/* Caption + metadata */}
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-red-500" />
              <span className="text-sm font-bold text-white">Image Analysis</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                result.provider === 'huggingface'
                  ? 'bg-yellow-950/30 text-yellow-500 border-yellow-900/40'
                  : 'bg-blue-950/30 text-blue-400 border-blue-900/40'
              }`}>
                {result.provider === 'huggingface' ? 'Hugging Face · Free' : 'Azure CV · Free tier'}
              </span>
              <span className="text-[10px] text-gray-600 ml-auto">
                {result.metadata.width && result.metadata.height ? `${result.metadata.width}×${result.metadata.height}` : ''} {result.metadata.format ?? ''}
              </span>
            </div>

            {result.caption && (
              <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800 mb-4">
                <p className="text-[10px] text-gray-600 uppercase font-semibold mb-1">Scene Description</p>
                <p className="text-sm text-white leading-relaxed">"{result.caption}"</p>
                <p className="text-[10px] text-gray-600 mt-1">{result.caption_confidence}% confidence</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-950 rounded-xl border border-gray-800 p-3 text-center">
                <div className="text-3xl font-black text-white">{result.face_count}</div>
                <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Faces detected</div>
              </div>
              <div className="bg-gray-950 rounded-xl border border-gray-800 p-3 text-center">
                <div className="text-3xl font-black text-red-400">{result.celebrities.length}</div>
                <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Celebrities ID'd</div>
              </div>
              <div className="bg-gray-950 rounded-xl border border-gray-800 p-3 text-center">
                <div className="text-3xl font-black text-white">{result.objects.length}</div>
                <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Objects found</div>
              </div>
            </div>

            {result.adult_content && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-900/40">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-300 font-semibold">Azure flagged this image as potentially containing adult content</span>
              </div>
            )}
          </div>

          {/* Celebrity note for HF */}
          {result.provider === 'huggingface' && (
            <div className="card-dark p-4 flex items-center gap-3">
              <User className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <p className="text-xs text-gray-500">Celebrity identification requires Azure Computer Vision. Add <code className="text-gray-400 bg-gray-900 px-1 py-0.5 rounded">AZURE_CV_KEY</code> + <code className="text-gray-400 bg-gray-900 px-1 py-0.5 rounded">AZURE_CV_ENDPOINT</code> to your .env to enable it.</p>
            </div>
          )}

          {/* Celebrities */}
          {result.celebrities.length > 0 && (
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-white">Identified People</span>
              </div>
              <div className="space-y-2">
                {result.celebrities.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-950/20 border border-red-900/30">
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                    <span className="text-xs text-red-400 font-mono">{c.confidence}% match</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-700 mt-3">Celebrity recognition uses Azure's public figure database. Confidence below 70% may be inaccurate.</p>
            </div>
          )}

          {/* Tags + Objects */}
          {(result.tags.length > 0 || result.objects.length > 0) && (
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-white">Content Tags</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.tags.map(t => (
                  <span key={t.name} className="text-[10px] bg-gray-800/80 text-gray-300 px-2 py-1 rounded-lg border border-gray-700/50 font-mono">
                    {t.name} <span className="text-gray-600">{t.confidence}%</span>
                  </span>
                ))}
              </div>
              {result.objects.length > 0 && (
                <>
                  <p className="text-[10px] text-gray-600 uppercase font-semibold mb-2">Objects Detected</p>
                  <div className="flex flex-wrap gap-2">
                    {result.objects.map((o, i) => (
                      <span key={i} className="text-[10px] bg-red-950/30 text-red-400 border border-red-900/30 px-2 py-1 rounded-lg font-mono">
                        {o.name} <span className="text-red-700">{o.confidence}%</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
              {result.dominant_colors.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">Colors:</span>
                  {result.dominant_colors.map(c => (
                    <span key={c} className="text-[10px] text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── External tool grid ───────────────────────────────────────────────── */}
      {SEARCH_TOOLS.map(group => (
        <div key={group.category} className="card-dark p-5">
          {group.warning && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-red-950/20 border border-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{group.warningText}</p>
            </div>
          )}
          <h3 className="font-semibold text-white text-sm mb-4">{group.category}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.items.map(item => (
              <a key={item.name} href={buildSearchUrl(item)} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/60 transition-colors group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase ${POWER_BADGE[item.power]}`}>
                      {POWER_LABEL[item.power]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  <p className="text-xs text-gray-600 mt-1 italic">{item.note}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
