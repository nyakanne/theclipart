import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FileImage,
  Fingerprint,
  Hash,
  ImageUp,
  Radar,
  RefreshCw,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'

import { api } from '@/services/api'
import type { ImageAnalysisResult } from '@/types'
import { getProviderLabel, getProviderSetup } from './providerSetup'

const REVERSE_IMAGE_PORTALS = [
  {
    name: 'PimEyes',
    url: 'https://pimeyes.com/en',
    type: 'Face/photo search',
    note: 'Use after in-app analysis when you need public-web corroboration from a face-oriented engine.',
  },
  {
    name: 'Google Lens',
    url: 'https://lens.google.com/',
    type: 'Visual web search',
    note: 'Useful when you want public web matches and context pages after the in-app analysis pass.',
  },
  {
    name: 'TinEye',
    url: 'https://tineye.com/',
    type: 'Reverse image search',
    note: 'Tracks exact or near-exact matches across indexed pages.',
  },
  {
    name: 'Yandex Images',
    url: 'https://yandex.com/images/',
    type: 'Visual similarity',
    note: 'Good as a second pass when other engines miss copies.',
  },
  {
    name: 'StopNCII.org',
    url: 'https://stopncii.org/how-it-works/',
    type: 'NCII hash protection',
    note: 'Use for adult intimate image protection on participating platforms.',
  },
] as const

const IMAGE_STEPS = [
  'Stage the image locally and record its SHA-256 before any provider call.',
  'Run the in-app provider mesh to compare Google Vision, Azure, and Hugging Face evidence inside Vindica.',
  'Save the returned analysis in the receipt so the vault keeps a durable artifact.',
  'Use external reverse-search portals only when you need public-web corroboration and add those URLs back into the same receipt.',
  'If the image is abusive or intimate, preserve screenshots and move into StopNCII, reports, and removals.',
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

function formatConfidence(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return `${Math.round(value * 100)}%`
}

function formatScore(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return `${Math.round(value * 100)}`
}

export function ReverseImageSearchPanel({ compact = false }: { compact?: boolean }) {
  const [receipt, setReceipt] = useState<ImageReceipt | null>(null)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [matchUrls, setMatchUrls] = useState('')
  const [notes, setNotes] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const packet = useMemo(() => {
    if (!receipt) return ''
    const normalizedUrls = matchUrls.split('\n').map(value => value.trim()).filter(Boolean)
    const analysisLines = analysis ? [
      '',
      'IN-APP IMAGE ANALYSIS:',
      `Status: ${analysis.status.toUpperCase()}`,
      `Summary: ${analysis.summary}`,
      `Caption: ${analysis.caption || 'None returned'}`,
      `Caption confidence: ${formatConfidence(analysis.confidence)}`,
      `Top tags: ${analysis.tags.slice(0, 8).map(tag => `${tag.name} (${formatConfidence(tag.confidence)})`).join(', ') || 'None returned'}`,
      `Top objects: ${analysis.objects.slice(0, 6).map(item => `${item.name} (${formatConfidence(item.confidence)})`).join(', ') || 'None returned'}`,
      '',
      'PROVIDER BREAKDOWN:',
      ...(analysis.provider_results.length
        ? analysis.provider_results.flatMap(provider => [
            `- ${getProviderLabel(provider.provider)}: ${provider.status.toUpperCase()}`,
            `  Summary: ${provider.summary}`,
            `  Caption: ${provider.caption || 'None returned'}`,
            `  Tags: ${provider.tags.slice(0, 6).map(tag => tag.name).join(', ') || 'None returned'}`,
            `  Objects: ${provider.objects.slice(0, 4).map(item => item.name).join(', ') || 'None returned'}`,
          ])
        : ['- No provider rows captured.']),
    ] : []

    return [
      'VINDICA REVERSE IMAGE RECEIPT',
      `File: ${receipt.fileName}`,
      `Type: ${receipt.fileType || 'unknown'}`,
      `Size: ${receipt.fileSize}`,
      `SHA-256: ${receipt.sha256}`,
      `Created: ${receipt.createdAt}`,
      ...analysisLines,
      '',
      'Confirmed result URLs:',
      ...(normalizedUrls.length ? normalizedUrls.map(url => `- ${url}`) : ['- No confirmed result URLs captured yet.']),
      '',
      'Evidence notes:',
      notes.trim() || 'No evidence notes recorded yet.',
      '',
      'Follow-up portals checked:',
      ...REVERSE_IMAGE_PORTALS.map(portal => `- ${portal.name}`),
    ].join('\n')
  }, [analysis, matchUrls, notes, receipt])

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
    setStagedFile(file)
    setAnalysis(null)
    setAnalysisError(null)
    setSavedId(null)
  }

  const analyzeStagedFile = async () => {
    if (!stagedFile) return
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const result = await api.lookup.imageUpload(stagedFile)
      setAnalysis(result)
    } catch (error) {
      setAnalysis(null)
      setAnalysisError(error instanceof Error ? error.message : 'Could not analyze this image.')
    } finally {
      setAnalyzing(false)
    }
  }

  const analyzeRemoteUrl = async () => {
    if (!imageUrl.trim()) return
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const result = await api.lookup.imageUrl(imageUrl.trim())
      setAnalysis(result)
    } catch (error) {
      setAnalysis(null)
      setAnalysisError(error instanceof Error ? error.message : 'Could not analyze this image URL.')
    } finally {
      setAnalyzing(false)
    }
  }

  const copyPacket = async () => {
    if (!packet) return
    await writeClipboard(packet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const saveReceipt = async () => {
    if (!receipt) return
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'image-receipt',
        title: `Image receipt: ${receipt.fileName}`,
        status: 'saved',
        payload: {
          file_name: receipt.fileName,
          file_type: receipt.fileType || 'unknown',
          file_size: receipt.fileSize,
          sha256: receipt.sha256,
          created_at: receipt.createdAt,
          image_url: imageUrl.trim() || null,
          analysis,
          match_urls: matchUrls.split('\n').map(value => value.trim()).filter(Boolean),
          notes: notes.trim(),
          body: packet,
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save image receipt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <Camera className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">Image Evidence Workbench</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Local hash receipt, in-app provider analysis, then corroboration only when needed.</p>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-red-500/40 bg-red-950/10 px-5 py-10 text-center transition-colors hover:bg-red-950/20">
          <ImageUp className="h-10 w-10 text-red-400" />
          <span className="mt-3 font-semibold">Stage image locally</span>
          <span className="mt-1 text-xs leading-5 text-gray-500">Generates a local hash receipt first. You choose whether to run provider analysis after staging.</span>
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
              {copied ? 'Copied case packet' : 'Copy case packet'}
            </button>
            <button type="button" onClick={saveReceipt} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Save image receipt
            </button>
            {(savedId || saveError) && (
              <div className={`rounded-lg border px-3 py-2 text-xs leading-5 ${saveError ? 'border-red-500/35 bg-red-950/25 text-red-100' : 'border-red-500/25 bg-red-950/15 text-red-100/85'}`}>
                {saveError || `Saved to command actions: ${savedId}`}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/45 p-4 text-sm leading-6 text-gray-500">
            Add an image to create the local receipt. Once staged, Vindica can analyze it in-app.
          </div>
        )}
      </aside>

      <section className="space-y-4">
        <div className="glass-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">In-app image provider mesh</h3>
              <p className="mt-1 text-sm text-gray-500">Run Google Vision, Azure, and Hugging Face from the backend first. Vindica merges the evidence and shows what each provider actually returned.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200">
              <ScanLine className="h-4 w-4" />
              backend-owned providers
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Remote image URL</span>
                <div className="flex gap-2">
                  <input
                    value={imageUrl}
                    onChange={event => setImageUrl(event.target.value)}
                    className="input-field"
                    placeholder="https://example.com/image.jpg"
                  />
                  <button
                    type="button"
                    onClick={analyzeRemoteUrl}
                    disabled={analyzing || !imageUrl.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-60"
                  >
                    {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Analyze URL
                  </button>
                </div>
              </label>

              <div className="rounded-xl border border-white/10 bg-black/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Analyze staged file</div>
                    <div className="mt-1 text-xs leading-5 text-gray-500">
                      {receipt ? 'Uses the file you already staged in the receipt panel.' : 'Stage a file on the left to unlock in-app analysis.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={analyzeStagedFile}
                    disabled={analyzing || !stagedFile}
                    className="red-button-glow inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    Analyze staged image
                  </button>
                </div>
              </div>

              {analysisError && (
                <div className="rounded-xl border border-red-500/35 bg-red-950/25 p-4 text-sm leading-6 text-red-100">
                  {analysisError}
                </div>
              )}

              {analysis && (
                <div className="rounded-xl border border-red-500/25 bg-black/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">Aggregate result</div>
                      <div className="mt-1 text-lg font-bold text-white">{analysis.status.toUpperCase()}</div>
                      <p className="mt-1 text-sm leading-6 text-gray-400">{analysis.summary}</p>
                    </div>
                    <div className="grid gap-2 text-right text-xs uppercase tracking-[0.16em] text-gray-500">
                      <span>Completed providers: {analysis.completed_providers.length}</span>
                      <span>Caption confidence: {formatConfidence(analysis.confidence)}</span>
                      <span>Adult score: {formatScore(analysis.adult_score)}</span>
                      <span>Racy score: {formatScore(analysis.racy_score)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MetricPanel label="Caption" value={analysis.caption || 'No caption returned'} />
                    <MetricPanel label="Top tags" value={analysis.tags.length ? analysis.tags.slice(0, 4).map(tag => tag.name).join(', ') : 'No tags returned'} />
                    <MetricPanel label="Objects" value={analysis.objects.length ? analysis.objects.slice(0, 4).map(item => item.name).join(', ') : 'No objects returned'} />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {analysis.provider_results.map(provider => {
                      const setup = getProviderSetup(provider.provider)
                      return (
                      <div key={provider.provider} className="rounded-xl border border-white/10 bg-black/45 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">{getProviderLabel(provider.provider)}</div>
                            <div className="mt-1 text-base font-bold text-white">{provider.status.toUpperCase()}</div>
                            <p className="mt-1 text-sm leading-6 text-gray-400">{provider.summary}</p>
                          </div>
                          <div className="grid gap-2 text-right text-xs uppercase tracking-[0.16em] text-gray-500">
                            <span>Caption confidence: {formatConfidence(provider.confidence)}</span>
                            <span>Adult score: {formatScore(provider.adult_score)}</span>
                            <span>Racy score: {formatScore(provider.racy_score)}</span>
                          </div>
                        </div>

                        {provider.status === 'unavailable' && provider.required_settings.length > 0 && (
                          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
                            <div className="font-semibold text-white">{getProviderLabel(provider.provider)} setup still needed</div>
                            <p className="mt-1 text-amber-100/85">{setup?.hint ?? 'Add the required backend settings and restart the API.'}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {provider.required_settings.map(setting => (
                                <code key={`${provider.provider}-${setting}`} className="rounded-md border border-amber-500/25 bg-black/35 px-2.5 py-1 text-xs text-amber-100">
                                  {setting}
                                </code>
                              ))}
                            </div>
                            {setup ? (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <a
                                  href={setup.setupHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-black/35 px-2.5 py-1 text-amber-100 transition-colors hover:border-amber-400/45 hover:text-white"
                                >
                                  {setup.setupLabel}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                {setup.docsHref ? (
                                  <a
                                    href={setup.docsHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/35 px-2.5 py-1 text-white/75 transition-colors hover:border-white/20 hover:text-white"
                                  >
                                    {setup.docsLabel ?? 'Docs'}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )}

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <MetricPanel label="Caption" value={provider.caption || 'No caption returned'} />
                          <MetricPanel label="Top tags" value={provider.tags.length ? provider.tags.slice(0, 4).map(tag => tag.name).join(', ') : 'No tags returned'} />
                          <MetricPanel label="Objects" value={provider.objects.length ? provider.objects.slice(0, 4).map(item => item.name).join(', ') : 'No objects returned'} />
                        </div>
                      </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Tags</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {analysis.tags.length ? analysis.tags.map(tag => (
                          <span key={`${tag.name}-${tag.confidence}`} className="rounded-full border border-red-500/25 bg-red-950/20 px-3 py-1 text-xs text-red-100">
                            {tag.name} · {formatConfidence(tag.confidence)}
                          </span>
                        )) : <span className="text-sm text-gray-500">No tag set returned.</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Detected objects</div>
                      <div className="mt-3 space-y-2">
                        {analysis.objects.length ? analysis.objects.map(item => (
                          <div key={`${item.name}-${item.box.x}-${item.box.y}`} className="rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-sm text-gray-300">
                            {item.name} · {formatConfidence(item.confidence)} · {item.box.w}x{item.box.h} at {item.box.x},{item.box.y}
                          </div>
                        )) : <div className="text-sm text-gray-500">No object detections returned.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/45 p-4">
              <div className="flex items-center gap-2 text-red-300">
                <ShieldCheck className="h-4 w-4" />
                <h4 className="font-bold text-white">Follow-up evidence capture</h4>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                After the in-app analysis pass, add any corroborating public-web result URLs here so the receipt stays the source of truth inside Vindica.
              </p>

              <div className="mt-4 grid gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Confirmed result URLs</span>
                  <textarea
                    value={matchUrls}
                    onChange={event => setMatchUrls(event.target.value)}
                    className="input-field min-h-24 font-mono text-xs"
                    placeholder="https://example.com/result-one&#10;https://example.com/result-two"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Evidence notes</span>
                  <textarea
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    className="input-field min-h-24 text-sm"
                    placeholder="Where it appeared, who posted it, whether it is NCII, and what action you need next."
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">External corroboration portals</h3>
              <p className="mt-1 text-sm text-gray-500">Use these only when you need public-web corroboration after the in-app analysis pass. Bring confirmed URLs back into the receipt above.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-300">
              <ExternalLink className="h-4 w-4" />
              optional follow-up
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
              <h3 className="font-bold">Reverse search record</h3>
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
                <EvidenceItem icon={<ScanLine className="h-4 w-4" />} label="Provider-by-provider image analysis summary" />
                <EvidenceItem icon={<FileImage className="h-4 w-4" />} label="Confirmed result URLs" />
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

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/45 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-2 text-sm leading-6 text-gray-200">{value}</div>
    </div>
  )
}
