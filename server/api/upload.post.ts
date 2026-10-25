// Giver browseren et kortlivet token, så den selv kan uploade direkte til Vercel Blob.
// Videoer er for store til at gå gennem en Vercel-funktion (max 4,5 MB).
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export default defineEventHandler(async (event) => {
  if (!blobEnabled) throw createError({ statusCode: 503, statusMessage: 'Upload er ikke sat op' })
  const body = await readBody<HandleUploadBody>(event)
  return handleUpload({
    body,
    request: event.node.req,
    onBeforeGenerateToken: async (pathname) => {
      if (!/^stickers\/[\w.-]+$/.test(pathname)) throw new Error('Ugyldigt filnavn')
      return {
        allowedContentTypes: ['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'],
        maximumSizeInBytes: 100 * 1024 * 1024,
        addRandomSuffix: true,
      }
    },
  })
})
