// "Installer appen": på Android/Chrome fanger vi browserens beforeinstallprompt og
// viser vores egen knap, der åbner Chromes installation. På iPhone i Safari findes
// den ikke – der viser vi en vejledning (Del → Føj til hjemmeskærm).
type InstallMode = 'prompt' | 'ios' | 'manual'

interface DeferredPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: DeferredPrompt | undefined
let listening = false

export function isStandalone() {
  return (
    import.meta.client &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true)
  )
}

export function useInstall() {
  const open = useState<InstallMode | null>('install-open', () => null)
  const canPrompt = useState('install-can-prompt', () => false)

  if (import.meta.client && !listening) {
    listening = true
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferred = e as DeferredPrompt
      canPrompt.value = true
    })
    window.addEventListener('appinstalled', () => {
      deferred = undefined
      canPrompt.value = false
      open.value = null
    })
  }

  /** Åbn boksen med det, der passer til telefonen */
  function show() {
    if (isStandalone()) return
    open.value = needsHomeScreen() ? 'ios' : canPrompt.value ? 'prompt' : 'manual'
  }

  /** Chromes egen installation */
  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => undefined)
    deferred = undefined
    canPrompt.value = false
    open.value = null
  }

  return { open, canPrompt, show, install }
}
