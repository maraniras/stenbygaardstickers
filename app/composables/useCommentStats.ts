// Tal til kommentar-badges (pr. navn med små bogstaver). Hentes én gang og igen,
// når man selv kommenterer eller giver 👍.
let loading: Promise<void> | undefined

export function useCommentStats() {
  const commentStats = useState<Record<string, CommentStats>>('comment-stats', () => ({}))

  function reload() {
    loading = $fetch<Record<string, CommentStats>>('/api/comment-stats')
      .then((r) => { commentStats.value = r })
      .catch(() => {})
    return loading
  }

  if (!loading && import.meta.client) reload()

  return { commentStats, reload }
}
