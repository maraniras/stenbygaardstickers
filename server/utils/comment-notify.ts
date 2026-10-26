// Besked om kommentarer: taggede, svar på ens kommentar og nye kommentarer på ens
// sticker. Hver modtager får kun én besked pr. kommentar (tag > svar > egen sticker),
// og man får aldrig besked om sin egen kommentar.

export async function notifyComment(c: CommentData, sticker: StickerData, parent: CommentData | undefined, onlyMentions?: string[]) {
  const url = `/sticker/${sticker.id}?comment=${c.id}`
  const body = snippet(c.text)
  const done = new Set<string>([nameKey(c.author)])
  const jobs: Promise<void>[] = []
  const send = (name: string, title: string, text = body) => {
    const key = nameKey(name)
    if (done.has(key)) return
    done.add(key)
    jobs.push(notifyUser(name, { title, body: text, url, tag: `comment-${c.id}` }))
  }

  for (const m of onlyMentions ?? c.mentions) send(m, `🏷️ ${c.author} har tagget dig`)
  if (!onlyMentions) {
    if (parent) send(parent.author, `↩️ ${c.author} har svaret dig`)
    for (const n of sticker.placedBy) send(n, `💬 Ny kommentar på ${sticker.title}`, `${c.author}: ${body}`)
  }
  await Promise.all(jobs)
}

const LIKE_RESEND_MS = 3600_000

/** "Nicole og 2 andre synes godt om din kommentar" – højst én gang i timen pr. kommentar */
export async function notifyLike(c: CommentData, likes: CommentLikes, liker: string | undefined) {
  const found = await findUser(c.author)
  if (!found) return
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
  })
}
