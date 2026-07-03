import { useEffect, useMemo, useState } from 'react'
import { Download, MonitorCheck } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
}

export function AppInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandaloneApp())

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const label = useMemo(() => {
    if (installed) return 'App installed'
    if (installPrompt) return 'Install app'
    return 'Install ready'
  }, [installPrompt, installed])

  async function install() {
    if (installed) return

    if (!installPrompt) {
      window.alert('Use your browser menu and choose Install Vindica or Add to Dock. The app is ready for desktop install once hosted over HTTPS.')
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
    }
    setInstallPrompt(null)
  }

  return (
    <button
      type="button"
      onClick={install}
      className="hidden items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-2 text-xs font-bold text-[#f5d7a1] transition-colors hover:border-[#d4af37]/45 hover:bg-[#d4af37]/15 md:inline-flex"
      title="Install Vindica as a desktop app"
    >
      {installed ? <MonitorCheck className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}
