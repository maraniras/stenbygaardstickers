// Serverer lokalt uploadede filer under `npm run dev`
const TYPES: Record<string, string> = {
  webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm',
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') ?? ''
  if (uploadMode !== 'local' || !LOCAL_NAME_RE.test(name)) throw createError({ statusCode: 404 })
  const data = await useStorage('data').getItemRaw<Buffer>(`uploads:${name}`)
  if (!data) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', TYPES[name.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream')
  return data
})
