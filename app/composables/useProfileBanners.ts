import type { ProfileBannerInventory } from '../../shared/utils/profile-banners'

export function useProfileBanners() {
  const { name } = useUser()
  const inventory = ref<ProfileBannerInventory>({ owned: [], equipped: null })
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  let revision = 0

  async function load() {
    const current = ++revision,
      owner = name.value,
      token = userToken()
    inventory.value = { owned: [], equipped: null }
    error.value = ''
    saving.value = false
    loading.value = !!owner
    if (!owner) return
    try {
      const result = await $fetch<ProfileBannerInventory>('/api/me/banners', {
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      })
      if (current === revision && token === userToken()) inventory.value = result
    } catch {
      if (current === revision) error.value = 'Kunne ikke hente dine bannere. Prøv igen.'
    } finally {
      if (current === revision) loading.value = false
    }
  }

  async function equip(banner: string | null) {
    if (!name.value || saving.value || loading.value) return
    const current = revision,
      token = userToken()
    saving.value = true
    error.value = ''
    try {
      const result = await $fetch<ProfileBannerInventory>('/api/me/banners', {
        method: 'PUT',
        body: { banner },
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      })
      if (current !== revision || token !== userToken()) return
      inventory.value = result
      await useUsers().reload()
    } catch (err: unknown) {
      if (current === revision)
        error.value =
          (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
          'Kunne ikke skifte banner. Prøv igen.'
    } finally {
      if (current === revision) saving.value = false
    }
  }

  watch(name, load, { immediate: true })
  onScopeDispose(() => {
    revision++
  })
  return { inventory, loading, saving, error, load, equip }
}
