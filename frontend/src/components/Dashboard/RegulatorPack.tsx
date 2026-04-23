import { useState } from 'react'
import { FileText, Download, Gavel, Send } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/services/api'
import type { ReportPackage } from '@/types'

const REGULATORS = [
  { id: 'ftc', name: 'FTC (USA)', url: 'https://www.ftccomplaintassistant.gov/' },
  { id: 'ico', name: 'ICO (UK)', url: 'https://ico.org.uk/make-a-complaint/' },
  { id: 'dpa', name: 'DPA (EU)', url: 'https://edpb.europa.eu/about-edpb/about-edpb/members_en' },
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-brand-400" />
          <span className="font-semibold text-white">Regulator Ready-Pack</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Generate a timestamped dossier (timeline, SHA-256 hashes, policy diffs) for FTC / DPA filing.
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

        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">File with a regulator</p>
          <div className="space-y-1.5">
            {REGULATORS.map(reg => (
              <a
                key={reg.id}
                href={reg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2 hover:border-gray-700 hover:bg-gray-800/50 transition-colors"
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
