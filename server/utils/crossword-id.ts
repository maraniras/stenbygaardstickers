import type { H3Event } from 'h3'
import type { CrosswordId } from '../../shared/utils/crosswords'
export function crosswordRequestId(event: H3Event): CrosswordId {
  const id = getQuery(event).id
  if (id === undefined || id === '1') return '1'
  if (id === 'marvel') return 'marvel'
  throw createError({ statusCode: 400, statusMessage: 'Ukendt krydsord.' })
}
