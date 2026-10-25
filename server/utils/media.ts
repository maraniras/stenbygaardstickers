// Uploadede billeder og videoer ligger i Vercel Blob. Nye Blob-stores logger ind med
// OIDC (BLOB_STORE_ID + headeren x-vercel-oidc-token), ældre med BLOB_READ_WRITE_TOKEN.
// Under `npm run dev` uden nogen af dem gemmes filerne i `.data/` og serveres fra /api/media/.
// Medier fra repoet ligger i public/media/ og slettes aldrig herfra.
import { del } from '@vercel/blob'
import type { H3Event } from 'h3'

const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN
export const blobEnabled = Boolean(readWriteToken || process.env.BLOB_STORE_ID)

export const uploadMode: 'blob' | 'presigned' | 'local' | 'off' = readWriteToken
  ? 'blob'
  : process.env.BLOB_STORE_ID ? 'presigned' : import.meta.dev ? 'local' : 'off'

/** OIDC-tokenet som Vercel sender med hver request til funktionen */
export function blobAuth(event: H3Event) {
  const oidcToken = getHeader(event, 'x-vercel-oidc-token')
  return !readWriteToken && oidcToken ? { oidcToken } : {}
}

/** Dev-siden uploader til mappen dev/ og må kun slette derfra (se redis.ts) */
export const blobFolder = isPreview ? 'dev/' : ''

const BLOB_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/(dev\/)?stickers\/[\w./-]+$/i
const DEV_BLOB_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/dev\//i
const LOCAL_RE = /^\/api\/media\/[\w.-]+$/
export const LOCAL_NAME_RE = /^[\w-]{1,80}\.(webp|jpg|jpeg|png|mp4|mov|m4v|webm)$/i

export function isOwnMedia(src: string) {
  return src.startsWith('/media/') || BLOB_RE.test(src) || LOCAL_RE.test(src)
}

function files(list: StickerMedia[]) {
  return list.flatMap(m => (m.poster ? [m.src, m.poster] : [m.src]))
}

/** Sletter uploadede filer, som ikke længere bruges */
export async function deleteUnused(event: H3Event, before: StickerMedia[], after: StickerMedia[] = []) {
  const keep = new Set(files(after))
  const gone = files(before).filter(src => !keep.has(src))
  // Dev har kopier af prod's stickers, som peger på prod's filer – dem må den ikke slette
  const blobs = gone.filter(src => BLOB_RE.test(src) && (!isPreview || DEV_BLOB_RE.test(src)))
  const local = gone.filter(src => LOCAL_RE.test(src))
  try {
    if (blobs.length && blobEnabled) await del(blobs, blobAuth(event))
    for (const src of local) await useStorage('data').removeItem(`uploads:${src.split('/').pop()}`)
  }
  catch (err) {
    console.error('Kunne ikke slette medier', err)
  }
}
