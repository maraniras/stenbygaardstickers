// Upstash Redis (Vercel Marketplace) via REST. Uden nøgler bruger stjerner og
// stickers Nitros lokale storage i `.data/`, så det også virker under `npm run dev`.

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export const redisEnabled = Boolean(url && token)

// Dev-siden (Vercel Preview) deler database med prod, men alle dens nøgler får
// "dev:" foran, så den aldrig kan læse eller ændre prod's data. Alle kommandoer
// vi bruger har nøglen som første argument.
export const isPreview = process.env.VERCEL_ENV === 'preview'

/** Lua keys are prefixed explicitly: EVAL's first argument is the script, not a key. */
export async function redisEval(script: string, keys: string[], args: string[]) {
  const prefixed = keys.map((k) => (isPreview ? `dev:${k}` : k))
  const response = await $fetch<{ result: unknown; error?: string }[]>(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
    body: [['EVAL', script, keys.length, ...prefixed, ...args]],
  })
  if (response[0]?.error) throw new Error(response[0].error)
  return response[0]?.result
}

export async function redis(cmds: (string | number)[][]) {
  const body = isPreview ? cmds.map(([cmd, key, ...rest]) => [cmd!, `dev:${key}`, ...rest]) : cmds
  const res = await $fetch<{ result: unknown; error?: string }[]>(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  return res.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}
