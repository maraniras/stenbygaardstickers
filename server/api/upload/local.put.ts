// Kun til `npm run dev` uden Blob-token: filen gemmes i .data/ og serveres fra /api/media/
import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  if (uploadMode !== 'local') throw createError({ statusCode: 404 })
  const { name } = getQuery(event)
  const ext = typeof name === 'string' ? name.split('.').pop()?.toLowerCase() : ''
  if (!ext || !LOCAL_NAME_RE.test(`x.${ext}`))
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig filtype' })
  const data = await readRawBody(event, false)
  if (!data?.length) throw createError({ statusCode: 400, statusMessage: 'Tom fil' })
  const file = `${randomUUID()}.${ext}`
  await useStorage('data').setItemRaw(`uploads:${file}`, data)
  return { url: `/api/media/${file}` }
})
