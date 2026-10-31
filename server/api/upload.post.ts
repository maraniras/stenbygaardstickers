// Lader browseren uploade direkte til Vercel Blob, da videoer er for store til at gå
// gennem en Vercel-funktion (max 4,5 MB). Nye stores (OIDC) bruger presignede URL'er,
// ældre stores med BLOB_READ_WRITE_TOKEN bruger klient-tokens.
import { issueSignedToken } from '@vercel/blob'
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from '@vercel/blob/client'

const limits = {
  allowedContentTypes: [
    'image/webp',
    'image/jpeg',
    'image/png',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
  ],
  maximumSizeInBytes: 100 * 1024 * 1024,
}

function checkPath(pathname: string) {
  const file = pathname.split('/').pop()!
  const ok = [`${blobFolder}stickers/${file}`, `${blobFolder}avatars/${file}`].includes(pathname)
  if (!ok || !/^[\w.-]+$/.test(file)) {
    throw new Error('Ugyldigt filnavn')
  }
}

export default defineEventHandler(async (event) => {
  if (uploadMode === 'blob') {
    const body = await readBody<HandleUploadBody>(event)
    return handleUpload({
      body,
      request: event.node.req,
      onBeforeGenerateToken: async (pathname) => {
        checkPath(pathname)
        return { ...limits, addRandomSuffix: true }
      },
    })
  }
  if (uploadMode === 'presigned') {
    const body = await readBody<HandleUploadPresignedBody>(event)
    return handleUploadPresigned({
      body,
      request: event.node.req,
      getSignedToken: async (pathname) => {
        // Filnavnet er allerede tilfældigt i browseren, og tokenet gælder kun præcis den sti
        checkPath(pathname)
        const token = await issueSignedToken({
          pathname,
          operations: ['put'],
          ...limits,
          ...blobAuth(event),
        })
        return { token, urlOptions: limits }
      },
    })
  }
  throw createError({ statusCode: 503, statusMessage: 'Upload er ikke sat op' })
})
