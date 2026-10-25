// Upload fra browseren: billeder skaleres ned og laves om til webp (eller jpeg
// på browsere uden webp-encoder), videoer sendes som de er med et stillbillede.
// Filerne går direkte til Vercel Blob – eller til .data/ under `npm run dev`.
import { upload, uploadPresigned } from '@vercel/blob/client'

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024

type Mode = 'blob' | 'presigned' | 'local' | 'off'
let modePromise: Promise<{ mode: Mode, folder: string }> | undefined

function uploadMode() {
  modePromise ??= $fetch<{ mode: Mode, folder?: string }>('/api/upload')
    .then(r => ({ mode: r.mode, folder: r.folder ?? '' }))
    .catch((err) => {
      modePromise = undefined
      throw err
    })
  return modePromise
}

function randomName() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('')
}

async function send(blob: Blob, ext: string, onProgress?: (pct: number) => void) {
  const { mode, folder } = await uploadMode()
  if (mode === 'off') throw new Error('Upload er ikke sat op endnu')
  if (mode === 'local') {
    const r = await $fetch<{ url: string }>('/api/upload/local', { method: 'PUT', query: { name: `f.${ext}` }, body: blob })
    onProgress?.(100)
    return r.url
  }
  const options = {
    access: 'public' as const,
    handleUploadUrl: '/api/upload',
    multipart: blob.size > 8 * 1024 * 1024,
    onUploadProgress: (e: { percentage: number }) => onProgress?.(e.percentage),
  }
  const pathname = `${folder}stickers/${randomName()}.${ext}`
  const r = mode === 'presigned' ? await uploadPresigned(pathname, blob, options) : await upload(pathname, blob, options)
  return r.url
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))
}

/** Tegner billedet ind i max×max og laver webp, eller jpeg hvis browseren ikke kan webp */
async function encode(source: CanvasImageSource, w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  let blob = await canvasBlob(canvas, 'image/webp', 0.8)
  let ext = 'webp'
  if (!blob || blob.type !== 'image/webp') {
    blob = await canvasBlob(canvas, 'image/jpeg', 0.82)
    ext = 'jpg'
  }
  if (!blob) throw new Error('Kunne ikke læse billedet')
  return { blob, ext, width: canvas.width, height: canvas.height }
}

async function loadImage(file: File) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bmp as CanvasImageSource, w: bmp.width, h: bmp.height }
  }
  catch {
    // Ældre Safari
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    await img.decode()
    URL.revokeObjectURL(url)
    return { source: img as CanvasImageSource, w: img.naturalWidth, h: img.naturalHeight }
  }
}

/** Første billede i videoen som stillbillede + videoens mål */
function videoFrame(file: File) {
  return new Promise<{ source: HTMLVideoElement, w: number, h: number, done: () => void }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = () => URL.revokeObjectURL(url)
    const timer = setTimeout(() => {
      done()
      reject(new Error('Kunne ikke læse videoen'))
    }, 20000)
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
    }
    video.onseeked = () => {
      clearTimeout(timer)
      resolve({ source: video, w: video.videoWidth, h: video.videoHeight, done })
    }
    video.onerror = () => {
      clearTimeout(timer)
      done()
      reject(new Error('Browseren kan ikke afspille denne video'))
    }
    video.src = url
  })
}

/** Datoen billedet er taget (EXIF), hvis telefonen har gemt den. Skal læses før
 *  komprimeringen, som fjerner EXIF. Biblioteket hentes først, når det skal bruges. */
export async function photoDate(file: File) {
  if (!file.type.startsWith('image/') && !/\.hei[cf]$/i.test(file.name)) return undefined
  try {
    const exifr = (await import('exifr')).default
    const tags = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
    const d = tags?.DateTimeOriginal ?? tags?.CreateDate
    if (!(d instanceof Date) || Number.isNaN(d.getTime()) || d > new Date()) return undefined
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  catch {
    return undefined
  }
}

/** Komprimerer og uploader én fil. Returnerer det, der skal stå i stickerens media-liste. */
export async function uploadMedia(file: File, onProgress?: (pct: number) => void): Promise<StickerMedia> {
  if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_BYTES) throw new Error('Videoen er over 100 MB')
    const frame = await videoFrame(file).catch(() => undefined)
    let poster: string | undefined
    if (frame) {
      const img = await encode(frame.source, frame.w, frame.h, 1080)
      frame.done()
      poster = await send(img.blob, img.ext)
    }
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
    const src = await send(file, /^(mp4|mov|m4v|webm)$/.test(ext) ? ext : 'mp4', onProgress)
    return { type: 'video', src, ...(poster ? { poster } : {}), width: frame?.w || undefined, height: frame?.h || undefined }
  }
  if (!file.type.startsWith('image/')) throw new Error('Kun billeder og videoer')
  const { source, w, h } = await loadImage(file)
  const img = await encode(source, w, h, 1600)
  const src = await send(img.blob, img.ext, onProgress)
  return { type: 'image', src, width: img.width, height: img.height }
}
