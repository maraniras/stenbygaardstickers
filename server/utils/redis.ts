// Upstash Redis (Vercel Marketplace) via REST. Uden nøgler bruger stjerner og
// stickers Nitros lokale storage i `.data/`, så det også virker under `npm run dev`.

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export const redisEnabled = Boolean(url && token)

export async function redis(cmds: (string | number)[][]) {
  const res = await $fetch<{ result: unknown, error?: string }[]>(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: cmds,
  })
  return res.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}
