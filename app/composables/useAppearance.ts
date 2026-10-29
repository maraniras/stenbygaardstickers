export type Appearance = 'system' | 'light' | 'dark'
const APPEARANCE_KEY = 'stenbygaard-appearance'

export function useAppearance() {
  const appearance = useState<Appearance>('appearance', () => {
    try {
      const saved = localStorage.getItem(APPEARANCE_KEY)
      return saved === 'light' || saved === 'dark' ? saved : 'system'
    }
    catch { return 'system' }
  })
  const systemDark = useState('appearance-system-dark', () => false)
  const dark = computed(() => appearance.value === 'dark' || (appearance.value === 'system' && systemDark.value))

  function setAppearance(value: Appearance) {
    appearance.value = value
    try { localStorage.setItem(APPEARANCE_KEY, value) }
    catch {}
  }

  return { appearance, systemDark, dark, setAppearance }
}
