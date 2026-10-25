// Admin-login og alle stickers inkl. dem der venter. Cookien er httpOnly, så
// browseren spørger serveren om man er logget ind.
export function useAdmin() {
  const admin = useState<boolean | null>('admin', () => null)
  const all = useState<StoredSticker[] | null>('admin-stickers', () => null)

  async function check() {
    admin.value = (await $fetch<{ admin: boolean }>('/api/admin/me').catch(() => ({ admin: false }))).admin
    return admin.value
  }

  async function login(password: string) {
    await $fetch('/api/admin/login', { method: 'POST', body: { password } })
    admin.value = true
  }

  async function logout() {
    await $fetch('/api/admin/logout', { method: 'POST' })
    admin.value = false
    all.value = null
  }

  async function load() {
    all.value = await $fetch<StoredSticker[]>('/api/admin/stickers')
  }

  /** Gemmer og opdaterer både admin-listen og kortet */
  async function save(id: string, body: Record<string, unknown>) {
    const s = await $fetch<StoredSticker>(`/api/admin/stickers/${id}`, { method: 'PUT', body })
    all.value = (all.value ?? []).map(x => (x.id === id ? s : x))
    await useStickers().reload()
    return s
  }

  async function remove(id: string) {
    await $fetch(`/api/admin/stickers/${id}`, { method: 'DELETE' })
    all.value = (all.value ?? []).filter(x => x.id !== id)
    await useStickers().reload()
  }

  return { admin, all, check, login, logout, load, save, remove }
}
