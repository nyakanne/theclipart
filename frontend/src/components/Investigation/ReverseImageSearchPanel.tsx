import { useMemo, useState } from 'react'
import { Camera, CheckCircle2, Copy, ExternalLink, Eye, FileImage, Fingerprint, Hash, ImageUp, Radar, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

const REVERSE_IMAGE_PORTALS = [
  {
    name: 'PimEyes',
    url: 'https://pimeyes.com/en',
    type: 'Face/photo search',
    note: 'Useful for finding places a face image may appear. You decide whether to upload on their site.',
  },
  {
    name: 'Google Lens',
    url: 'https://lens.google.com/',
    type: 'Visual web search',
    note: 'Good for web pages, similar images, and reposted public media.',
  },
  {
    name: 'TinEye',
    url: 'https://tineye.com/',
    type: 'Reverse image search',
    note: 'Tracks exact or near-exact image matches across indexed pages.',
  },
  {
    name: 'Yandex Images',
    url: 'https://yandex.com/images/',
    type: 'Visual similarity',
    note: 'Useful as a second pass when other image engines miss copies.',
  },
  {
    name: 'FaceCheck.ID',
    url: 'https://facecheck.id/',
    type: 'Face search',
    note: 'Face-oriented search portal. Use only for yourself or authorized safety work.',
  },
  {
    name: 'StopNCII.org',
    url: 'https://stopncii.org/how-it-works/',
    type: 'NCII hash protection',
    note: 'For adults creating hashes of intimate images to help block sharing on participating platforms.',
  },
] as const

const IMAGE_STEPS = [
  'Create a local hash receipt before uploading anywhere.',
  'Search on PimEyes, Google Lens, TinEye, and Yandex one at a time.',
  'Save result URLs, screenshots, dates, and account/profile links.',
  'If intimate or exploitative content appears, use StopNCII, Take It Down, CCRI, and platform reports.',
  'Add confirmed URLs to the authority report and removal queue.',
] as const

type ImageReceipt = {
  fileName: string
  fileSize: string
  fileType: string
  sha256: string
  createdAt: string
  previewUrl: string
}

async function sha256(file: File) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function writeClipboard(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('Copy failed')
}

export function ReverseImageSearchPanel({ compact = false }: { compact?: boolean }) {
  const [receipt, setReceipt] = useState<ImageReceipt | null>(null)
  const [copied, setCopied] = useState(false)

  const packet = useMemo(() => {
    if (!receipt) return ''
    return [
      'DATA GUARD REVERSE IMAGE SEARCH RECEIPT',
      `File: ${receipt.fileName}`,
      `Type: ${receipt.fileType || 'unknown'}`,
      `Size: ${receipt.fileSize}`,
      `SHA-256: ${receipt.sha256}`,
      `Created: ${receipt.createdAt}`,
      '',
      'Suggested search log:',
      ...REVERSE_IMAGE_PORTALS.slice(0, 5).map(portal => `- ${portal.name}: [paste result URLs / notes here]`),
    ].join('\n')
  }, [receipt])

  const ingestFile = async (file: File) => {
    if (receipt?.previewUrl) URL.revokeObjectURL(receipt.previewUrl)
    const digest = await sha256(file)
    setReceipt({
      fileName: file.name,
      fileType: file.type,
      fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      sha256: digest,
      createdAt: new Date().toLocaleString(),
      previewUrl: URL.createObjectURL(file),
    })
  }

  const copyPacket = async () => {
    if (!packet) return
    await writeClipboard(packet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">Reverse Image Search</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">PimEyes-style image investigation, local hashing, and report notes.</p>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-red-500/40 bg-red-950/10 px-5 py-10 text-center transition-colors hover:bg-red-950/20">
          <ImageUp className="h-10 w-10 text-red-400" />
          <span className="mt-3 font-semibold">Stage image locally</span>
          <span className="mt-1 text-xs leading-5 text-gray-500">Creates a preview and hash receipt in your browser. It does not upload the file.</span>
          <input
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={event => {
              const file = event.target.files?.[0]
              if (file) void ingestFile(file)
            }}
          />
        </label>

        {receipt ? (
          <div className="mt-4 space-y-3">
            <img src={receipt.previewUrl} alt="" className="h-56 w-full rounded-lg border border-white/10 object-cover" />
            <ReceiptLine label="File" value={`${receipt.fileName} (${receipt.fileSize})`} />
            <ReceiptLine label="Created" value={receipt.createdAt} />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">SHA-256</div>
              <div className="mt-2 break-all rounded-lg border border-white/10 bg-black/55 p-3 font-mono text-[11px] leading-5 text-red-100">{receipt.sha256}</div>
            </div>
            <button type="button" onClick={copyPacket} className="red-button-glow inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white">
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied search packet' : 'Copy search packet'}
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/45 p-4 text-sm leading-6 text-gray-500">
            Add an image to generate the local evidence receipt before searching the portals.
          </div>
        )}
      </aside>

      <section className="space-y-4">
        <div className="glass-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Image search portals</h3>
              <p className="mt-1 text-sm text-gray-500">Open each search tool manually and save confirmed matches back into your report packet.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200">
              <ShieldCheck className="h-4 w-4" />
              no auto-upload
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {REVERSE_IMAGE_PORTALS.map(portal => (
              <a
                key={portal.name}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-black/45 p-4 transition-colors hover:border-red-500/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{portal.name}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-300">{portal.type}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-red-400" />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-500">{portal.note}</p>
              </a>
            ))}
          </div>
        </div>

        {!compact && (
          <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
            <div className="glass-panel rounded-xl p-5">
              <h3 className="font-bold">Reverse search workflow</h3>
              <div className="mt-4 space-y-3">
                {IMAGE_STEPS.map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-red-500/35 text-xs font-black text-red-200">{index + 1}</span>
                    <p className="text-sm leading-6 text-gray-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 text-red-300">
                <Radar className="h-5 w-5" />
                <h3 className="font-bold text-white">Evidence to save</h3>
              </div>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-gray-400">
                <EvidenceItem icon={<FileImage className="h-4 w-4" />} label="Result URLs" />
                <EvidenceItem icon={<Eye className="h-4 w-4" />} label="Screenshots" />
                <EvidenceItem icon={<Fingerprint className="h-4 w-4" />} label="Image hash" />
                <EvidenceItem icon={<Hash className="h-4 w-4" />} label="Case notes" />
              </div>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  )
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-200">{value}</div>
    </div>
  )
}

function EvidenceItem({ icon, label }: { icon: JSX.Element; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/45 p-3">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-red-500/30 text-red-300">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
