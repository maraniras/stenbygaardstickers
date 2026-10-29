// Alle der har valgt et navn, med profilbillede. Hentes én gang og igen, når
// man selv skifter billede eller navn.
let loading: Promise<void> | undefined

export function useUsers() {
  const users = useState<PublicUser[]>('users', () => [])
  const failed = useState('users-failed', () => false)

  function reload() {
    loading = $fetch<PublicUser[]>('/api/users')
      .then((r) => { users.value = r; failed.value = false })
      .catch(() => { failed.value = true })
    return loading
  }

  if (!loading && import.meta.client) reload()

  const find = (name: string) => users.value.find(u => sameName(u.name, name))

  return {
    users,
    failed,
    reload,
    isTaken: (name: string) => Boolean(find(name)),
    avatarFor: (name: string) => find(name)?.avatar,
  }
}
