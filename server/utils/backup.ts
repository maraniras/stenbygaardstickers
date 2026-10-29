// Backup af databasen: alle stickers (også dem der venter), 👍, kommentarer og brugere som én
// JSON-fil. Køres dagligt af Vercel Cron (vercel.json) og kan hentes fra admin.
// Gemmes i Vercel Blob under backups/ (med tilfældigt suffiks, så adressen ikke kan
// gættes) – eller i .data/ under `npm run dev`. De nyeste 30 beholdes.
import { del, list, put } from '@vercel/blob'
import type { H3Event } from 'h3'

const KEEP = 30

export interface Backup {
  createdAt: string
  stickers: StoredSticker[]
  /** stickerId → deviceId → antal 👍 */
  ratings: Record<string, Record<string, number>>
  comments?: CommentData[]
  /** kommentar-id → "u:navn"/"d:enhed" → værdi */
  commentLikes?: Record<string, Record<string, string>>
  /** Brugere med navn, profilbillede, indstillinger og enheder (kun hashes af nøglerne) */
  users?: UserRecord[]
  /** Saldi, udbetalingsnøgler, spilstatus og historik – ikke blot de viste tal. */
  economy?: Awaited<ReturnType<typeof allEconomyRecords>>
  games?: Awaited<ReturnType<typeof gameBackup>>
}

async function allRatings(): Promise<Backup['ratings']> {
  if (!redisEnabled) return (await useStorage('data').getItem<Backup['ratings']>('ratings')) ?? {}
  const [ids] = await redis([['SMEMBERS', 'rated']]) as [string[]]
  if (!ids.length) return {}
  const res = await redis(ids.map(id => ['HGETALL', `rating:${id}`])) as string[][]
  const out: Backup['ratings'] = {}
  ids.forEach((id, i) => {
    const flat = res[i] ?? []
    out[id] = {}
    for (let j = 0; j < flat.length; j += 2) out[id]![flat[j]!] = Number(flat[j + 1])
  })
  return out
}

export async function createBackup(): Promise<Backup> {
  const comments = await allComments()
  return {
    createdAt: new Date().toISOString(),
    stickers: await listStickers(),
    ratings: await allRatings(),
    comments,
    commentLikes: await getLikes(comments.map(c => c.id)),
    users: await listUsers(),
    economy: await allEconomyRecords(),
    games: await gameBackup(),
  }
}

export interface BackupFile { name: string, url?: string, size: number, createdAt: string }

/** Gemmer en backup og sletter dem ud over de nyeste 30 */
export async function storeBackup(event: H3Event) {
  const backup = await createBackup()
  const name = `stickers-${backup.createdAt.slice(0, 10)}.json`
  const body = JSON.stringify(backup, null, 2)
  if (!blobEnabled) {
    await useStorage('data').setItem(`backups:${name}`, backup)
  }
  else {
    await put(`${blobFolder}backups/${name}`, body, { access: 'public', addRandomSuffix: true, contentType: 'application/json', ...blobAuth(event) })
  }
  const files = await listBackups(event)
  const old = files.slice(KEEP)
  if (old.length) {
    if (blobEnabled) await del(old.map(f => f.url!), blobAuth(event))
    else for (const f of old) await useStorage('data').removeItem(`backups:${f.name}`)
  }
  return { name, stickers: backup.stickers.length, size: body.length }
}

/** Nyeste først */
export async function listBackups(event: H3Event): Promise<BackupFile[]> {
  if (!blobEnabled) {
    const storage = useStorage('data')
    const keys = await storage.getKeys('backups')
    const files = await Promise.all(keys.map(async (k) => {
      const meta = await storage.getMeta(k)
      const name = k.split(':').pop()!
      return { name, size: Number(meta.size ?? 0), createdAt: (meta.mtime ? new Date(meta.mtime) : new Date()).toISOString() }
    }))
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const { blobs } = await list({ prefix: `${blobFolder}backups/`, ...blobAuth(event) })
  return blobs
    .map(b => ({ name: b.pathname.split('/').pop()!, url: b.url, size: b.size, createdAt: new Date(b.uploadedAt).toISOString() }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
