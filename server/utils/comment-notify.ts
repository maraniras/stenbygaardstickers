// Besked om kommentarer: taggede, svar på ens kommentar og nye kommentarer på ens
// sticker. Hver modtager får kun én besked pr. kommentar (tag > svar > egen sticker –
// har man slået en type fra, prøves den næste), og man får aldrig besked om sin egen.

export async function notifyComment(c: CommentData, sticker: StickerData, parent: CommentData | undefined, onlyMentions?: string[]) {
  const url = `/sticker/${sticker.id}?comment=${c.id}`
  const body = snippet(c.text)
  const candidates: { name: string, type: NotifyType, title: string, text: string }[] = []
  for (const m of onlyMentions ?? c.mentions) candidates.push({ name: m, type: 'tags', title: `🏷️ ${c.author} har tagget dig`, text: body })
  if (!onlyMentions) {
    if (parent) candidates.push({ name: parent.author, type: 'replies', title: `↩️ ${c.author} har svaret dig`, text: body })
    for (const n of sticker.placedBy) candidates.push({ name: n, type: 'comments', title: `💬 Ny kommentar på ${sticker.title}`, text: `${c.author}: ${body}` })
  }

  const done = new Set<string>([nameKey(c.author)])
  const jobs: Promise<void>[] = []
  for (const cand of candidates) {
    const key = nameKey(cand.name)
    if (done.has(key)) continue
    const found = await findUser(cand.name)
    if (!found || !wants(found.user.notify, cand.type)) continue
    done.add(key)
    jobs.push(notifyUser(cand.name, { title: cand.title, body: cand.text, url, tag: `comment-${c.id}` }, cand.type))
  }
  await Promise.all(jobs)
}

const LIKE_RESEND_MS = 3600_000

/** "Nicole og 2 andre synes godt om din kommentar" – højst én gang i timen pr. kommentar */
export async function notifyLike(c: CommentData, likes: CommentLikes, liker: string | undefined) {
  const found = await findUser(c.author)
  if (!found || !wants(found.user.notify, 'likes')) return
  const stamp = found.user.notifiedAt?.[`like:${c.id}`]
  if (stamp && Date.now() - Date.parse(stamp) < LIKE_RESEND_MS) return
  await updateUser(found.key, (u) => {
    u.notifiedAt = { ...u.notifiedAt, [`like:${c.id}`]: new Date().toISOString() }
  })
  const first = liker ?? 'Nogen'
  const others = likes.count - 1
  const who = others > 0 ? `${first} og ${others} ${others === 1 ? 'anden' : 'andre'}` : first
  await notifyUser(c.author, {
    title: `👍 ${who} synes godt om din kommentar`,
    body: snippet(c.text),
    url: `/sticker/${c.stickerId}?comment=${c.id}`,
    tag: `like-${c.id}`,
  }, 'likes')
}
