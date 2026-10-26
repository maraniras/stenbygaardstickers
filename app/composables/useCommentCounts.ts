// Antal kommentarer pr. sticker. Hentes én gang, igen når appen kommer i forgrunden,
// og når man selv kommenterer.
let loading: Promise<void> | undefined

export function useCommentCounts() {
  const counts = useState<Record<string, number>>('comment-counts', () => ({}))

  function reload() {
    loading = $fetch<Record<string, number>>('/api/comment-counts')
      .then((r) => { counts.value = r })
      .catch(() => {})
    return loading
  }

  if (!loading && import.meta.client) {
    reload()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reload()
    })
  }

  return { counts, reload }
}
