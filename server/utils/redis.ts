// Upstash Redis (Vercel Marketplace) via REST. Uden nøgler bruger stjerner og
// stickers Nitros lokale storage i `.data/`, så det også virker under `npm run dev`.

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export const redisEnabled = Boolean(url && token)

// Dev-siden (Vercel Preview) deler database med prod, men alle dens nøgler får
// "dev:" foran, så den aldrig kan læse eller ændre prod's data. Alle kommandoer
// vi bruger har nøglen som første argument.
export const isPreview = process.env.VERCEL_ENV === 'preview'

export async function redis(cmds: (string | number)[][]) {
  const body = isPreview ? cmds.map(([cmd, key, ...rest]) => [cmd!, `dev:${key}`, ...rest]) : cmds
  const res = await $fetch<{ result: unknown, error?: string }[]>(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  return res.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}
