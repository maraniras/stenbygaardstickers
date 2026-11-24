import type { CrosswordHelp, CrosswordView } from '../../shared/types/crossword'
import type { CrosswordLetterShop } from '../../shared/utils/crossword-letters'

export function useCrossword(
  preview = false,
  id: import('../../shared/utils/crosswords').CrosswordId = '1',
) {
  const view = ref<CrosswordView | null>(null)
  const error = ref('')
  const pending = ref(true)
  const now = ref(Date.now())
  const { name } = useUser()
  let timer: ReturnType<typeof setInterval> | undefined
  let request: Promise<void> | undefined
  let alive = true
  let viewRevision = 0
  const options = () => ({
    query: { id, ...(preview ? { preview: '1' } : {}) },
    headers: { 'x-user-token': userToken() },
  })
  function reload() {
    if (request) return request
    request = (async () => {
      const revision = viewRevision
      try {
        const data = await $fetch<CrosswordView>('/api/games/crossword', options())
        if (alive && revision === viewRevision) {
          view.value = data
          error.value = ''
        }
      } catch (err: any) {
        if (alive) error.value = err?.data?.statusMessage || 'Kunne ikke hente krydsordet.'
      } finally {
        if (alive) pending.value = false
        request = undefined
      }
    })()
    return request
  }
  async function submit(answers: Record<string, string>) {
    viewRevision++
    const result = await $fetch<{ correct: boolean; view: CrosswordView }>('/api/games/crossword', {
      ...options(),
      method: 'POST',
      body: { answers },
    })
    if (alive) view.value = result.view
    return result
  }
  function checkHelp(answers: Record<string, string>) {
    return $fetch<CrosswordHelp>('/api/games/crossword/help', {
      ...options(),
      method: 'POST',
      body: { answers, device: deviceId() },
    })
  }
  async function buyLetter(cell: string, price: number) {
    const owner = name.value,
      token = userToken()
    viewRevision++
    const shop = await $fetch<CrosswordLetterShop>('/api/games/crossword/letter', {
      ...options(),
      method: 'POST',
      body: { cell, price },
      retry: 0,
    })
    if (!alive || name.value !== owner || userToken() !== token)
      throw new Error('Brugeren er skiftet. Åbn krydsordet igen.')
    if (view.value) view.value = { ...view.value, letterShop: shop }
    return shop
  }
  watch(name, () => {
    viewRevision++
    view.value = null
    void reload()
  })
  onMounted(() => {
    now.value = Date.now()
    void reload()
    let ticks = 0
    timer = setInterval(() => {
      now.value = Date.now()
      const due =
        view.value?.opensAt && !view.value.open && Date.parse(view.value.opensAt) <= Date.now()
      const helpDue =
        view.value?.helpAt &&
        !view.value.helpAvailable &&
        Date.parse(view.value.helpAt) <= Date.now()
      if (!document.hidden && (++ticks % 15 === 0 || due || helpDue)) void reload()
    }, 1000)
  })
  onBeforeUnmount(() => {
    alive = false
    clearInterval(timer)
  })
  return { view, error, pending, now, reload, submit, checkHelp, buyLetter }
}
