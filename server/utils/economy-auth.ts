import type { H3Event } from 'h3'
export function requireActivePlayer(user: { deactivatedAt?: string }) {
  if (user.deactivatedAt)
    throw createError({
      statusCode: 403,
      statusMessage: 'Din bruger er deaktiveret og kan ikke deltage i spil.',
    })
}
export async function economyUser(event: H3Event) {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (!found)
    throw createError({
      statusCode: 401,
      statusMessage: 'Vælg dit navn for at spille og gemme bananer.',
    })
  requireActivePlayer(found.user)
  return found
}
