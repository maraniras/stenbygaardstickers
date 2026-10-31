/** "lige nu", "5 min.", "3 t.", "i går", ellers "12. okt." */
export function timeAgo(iso: string, now = Date.now()) {
  const ms = now - Date.parse(iso)
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'lige nu'
  if (min < 60) return `${min} min.`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} t.`
  const d = new Date(iso)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'i går'
  return d.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}),
  })
}
