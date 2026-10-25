// Uploadede billeder og videoer ligger i Vercel Blob (BLOB_READ_WRITE_TOKEN).
// Under `npm run dev` uden token gemmes de i `.data/` og serveres fra /api/media/.
// Medier fra repoet ligger i public/media/ og slettes aldrig herfra.
import { del } from '@vercel/blob'

export const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export const uploadMode: 'blob' | 'local' | 'off' = blobEnabled ? 'blob' : import.meta.dev ? 'local' : 'off'

const BLOB_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/stickers\/[\w./-]+$/i
const LOCAL_RE = /^\/api\/media\/[\w.-]+$/
export const LOCAL_NAME_RE = /^[\w-]{1,80}\.(webp|jpg|jpeg|png|mp4|mov|m4v|webm)$/i

export function isOwnMedia(src: string) {
  return src.startsWith('/media/') || BLOB_RE.test(src) || LOCAL_RE.test(src)
}

function files(list: StickerMedia[]) {
  return list.flatMap(m => (m.poster ? [m.src, m.poster] : [m.src]))
}

/** Sletter uploadede filer, som ikke længere bruges */
export async function deleteUnused(before: StickerMedia[], after: StickerMedia[] = []) {
  const keep = new Set(files(after))
  const gone = files(before).filter(src => !keep.has(src))
  const blobs = gone.filter(src => BLOB_RE.test(src))
  const local = gone.filter(src => LOCAL_RE.test(src))
  try {
    if (blobs.length && blobEnabled) await del(blobs)
    for (const src of local) await useStorage('data').removeItem(`uploads:${src.split('/').pop()}`)
  }
  catch (err) {
    console.error('Kunne ikke slette medier', err)
  }
}
