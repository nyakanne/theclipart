import { useState } from 'react'
import { ExternalLink, Image, AlertTriangle, Upload, Link } from 'lucide-react'

const SEARCH_TOOLS = [
  {
    category: 'Facial Recognition',
    warning: true,
    warningText: 'These tools use facial recognition. Only use images you have rights to search.',
    items: [
      { name: 'PimEyes', desc: 'AI-powered facial recognition search across the public web.', url: 'https://pimeyes.com', note: 'Paid — most comprehensive', power: 'high' },
      { name: 'FaceCheck.ID', desc: 'Free face search engine for finding photos online.', url: 'https://facecheck.id', note: 'Free tier available', power: 'medium' },
      { name: 'Search4Faces', desc: 'Reverse face search via social media.', url: 'https://search4faces.com', note: 'Russia/VK focused', power: 'medium' },
      { name: 'Clearview AI (opt-out)', desc: 'Remove yourself from Clearview\'s database.', url: 'https://privacycompliance.clearview.ai/', note: 'Opt-out only', power: 'optout' },
    ],
  },
  {
    category: 'Reverse Image Search',
    warning: false,
    items: [
      { name: 'Google Lens', desc: 'Google\'s image search — finds visually similar images across the web.', url: 'https://lens.google.com', note: 'Upload or paste URL', power: 'high' },
      { name: 'TinEye', desc: 'Finds exact and modified copies of an image across the web.', url: 'https://tineye.com', note: 'Exact match specialist', power: 'high' },
      { name: 'Yandex Images', desc: 'Russian search engine with strong facial recognition matching.', url: 'https://yandex.com/images/', note: 'Strong for portraits', power: 'high' },
      { name: 'Bing Visual Search', desc: 'Microsoft\'s reverse image and visual search.', url: 'https://www.bing.com/visualsearch', note: 'Good for product/face search', power: 'medium' },
      { name: 'OSINT Industries', desc: 'Multi-source OSINT image and profile search.', url: 'https://osint.industries', note: 'OSINT focused', power: 'medium' },
    ],
  },
  {
    category: 'NCII / Image Abuse Reporting',
    warning: false,
    items: [
      { name: 'StopNCII', desc: 'Hash your intimate images to prevent them spreading. UK-based coalition tool.', url: 'https://stopncii.org', note: 'Prevent distribution globally', power: 'protection' },
      { name: 'Take It Down (NCMEC)', desc: 'Remove non-consensual intimate images. US NCMEC service.', url: 'https://takeitdown.ncmec.org', note: 'US-focused, free', power: 'protection' },
      { name: 'CCRI (Cyber Civil Rights)', desc: 'Support + resources for NCII victims. Removal assistance.', url: 'https://cybercivilrights.org', note: 'Advocacy + resources', power: 'protection' },
      { name: 'Google Image Removal', desc: 'Request removal of non-consensual intimate images from Google Search.', url: 'https://support.google.com/websearch/troubleshooter/9685456', note: 'Direct Google removal', power: 'protection' },
      { name: 'Meta NCII Reporting', desc: 'Report non-consensual intimate images across Facebook and Instagram.', url: 'https://www.facebook.com/help/contact/260749603972907', note: 'Facebook/Instagram', power: 'protection' },
    ],
  },
]

const POWER_BADGE: Record<string, string> = {
  high: 'bg-red-950/50 text-red-400 border-red-900/40',
  medium: 'bg-orange-950/50 text-orange-400 border-orange-900/40',
  optout: 'bg-purple-950/50 text-purple-400 border-purple-900/40',
  protection: 'bg-green-950/50 text-green-400 border-green-900/40',
}

const POWER_LABEL: Record<string, string> = {
  high: 'High Power', medium: 'Medium', optout: 'Opt-Out', protection: 'Protection',
}

export function ImageSearchTab() {
  const [imageUrl, setImageUrl] = useState('')
  const [mode, setMode] = useState<'url' | 'upload'>('url')

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="card-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Image className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Reverse Image Search</h2>
            <p className="text-xs text-gray-500">Find where your photos appear, and remove non-consensual images</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('url')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${mode === 'url' ? 'bg-red-950/50 text-red-400 border-red-900/40' : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}
          >
            <Link className="h-3.5 w-3.5" /> Image URL
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${mode === 'upload' ? 'bg-red-950/50 text-red-400 border-red-900/40' : 'text-gray-500 border-gray-800 hover:border-gray-700'}`}
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>

        {mode === 'url' ? (
          <input
            className="input-field"
            placeholder="https://example.com/photo.jpg — paste an image URL to pre-fill search tools"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-800 rounded-xl p-8 text-center">
            <Upload className="h-8 w-8 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Upload functionality opens each tool directly.</p>
            <p className="text-xs text-gray-600 mt-1">Use the links below to upload your image to each search engine directly.</p>
          </div>
        )}

        {imageUrl && (
          <p className="text-xs text-green-500 mt-2">
            ✓ URL ready — click any tool below to search with this image.
          </p>
        )}
      </div>

      {SEARCH_TOOLS.map(group => (
        <div key={group.category} className="card-dark p-5">
          {group.warning && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-orange-950/20 border border-orange-900/30">
              <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-300">{group.warningText}</p>
            </div>
          )}

          <h3 className="font-semibold text-white text-sm mb-4">{group.category}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.items.map(item => {
              const searchUrl = imageUrl && mode === 'url'
                ? item.url.includes('google') ? `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`
                : item.url.includes('tineye') ? `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`
                : item.url.includes('yandex') ? `https://yandex.com/images/search?img_url=${encodeURIComponent(imageUrl)}&rpt=imageview`
                : item.url
                : item.url

              return (
                <a
                  key={item.name}
                  href={searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 rounded-xl border border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/60 transition-colors group"
                >
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
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
