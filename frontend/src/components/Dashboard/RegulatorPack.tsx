import { useState } from 'react'
import { FileText, Download, Gavel, Send, ShieldAlert } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/services/api'
import type { ReportPackage } from '@/types'

const REGULATORS = [
  { id: 'ic3', name: 'FBI IC3 Cybercrime Report', url: 'https://www.ic3.gov/' },
  { id: 'ag', name: 'State Attorney General Privacy Complaint', url: 'https://www.naag.org/find-my-ag/' },
  { id: 'ftc', name: 'FTC ReportFraud', url: 'https://reportfraud.ftc.gov/' },
  { id: 'ccri', name: 'Cyber Civil Rights Initiative', url: 'https://cybercivilrights.org/ccri-crisis-helpline/' },
  { id: 'stopncii', name: 'StopNCII Adult Image Hashing', url: 'https://stopncii.org/how-it-works/' },
  { id: 'takeitdown', name: 'NCMEC Take It Down', url: 'https://takeitdown.ncmec.org/' },
]

export function RegulatorPack({ scanId }: { scanId: string }) {
  const [pkg, setPkg] = useState<ReportPackage | null>(null)
  const [generating, setGenerating] = useState<'pdf' | 'json' | 'csv' | null>(null)

  const generate = async (fmt: 'pdf' | 'json' | 'csv') => {
    setGenerating(fmt)
    try {
      const p = await api.report.generate(scanId, fmt)
      setPkg(p)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-brand-400" />
          <span className="font-semibold text-white">Regulator and Takedown Ready-Pack</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Generate a timestamped dossier with broker listings, compliance signals, SHA-256 evidence hashes, and platform report notes.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['pdf', 'json', 'csv'] as const).map(fmt => (
            <Button
              key={fmt}
              size="sm"
              variant="secondary"
              loading={generating === fmt}
              icon={<FileText className="h-4 w-4" />}
              onClick={() => generate(fmt)}
            >
              Generate {fmt.toUpperCase()}
            </Button>
          ))}
        </div>

        {pkg && (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Package ready</span>
              <a href={pkg.download_url} download>
                <Button size="sm" icon={<Download className="h-4 w-4" />}>Download</Button>
              </a>
            </div>
            <p className="text-xs text-gray-500">
              Generated {new Date(pkg.generated_at).toLocaleString()} · Expires {new Date(pkg.expires_at).toLocaleString()}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-red-500/25 bg-red-950/15 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-red-300" />
            <p className="text-sm leading-6 text-red-100">
              If there is immediate physical danger, call emergency services. These links help organize online-abuse, privacy, broker, NCII, and cybercrime reports.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">File or escalate</p>
          <div className="space-y-1.5">
            {REGULATORS.map(reg => (
              <a
                key={reg.id}
                href={reg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2 hover:border-red-500/40 hover:bg-red-950/20 transition-colors"
              >
                <span className="text-sm text-gray-300">{reg.name}</span>
                <Send className="h-3.5 w-3.5 text-gray-500" />
              </a>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
