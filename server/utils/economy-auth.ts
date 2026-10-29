import type { H3Event } from 'h3'
export async function economyUser(event: H3Event) {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Vælg dit navn for at spille og gemme bananer.' })
  return found
}
