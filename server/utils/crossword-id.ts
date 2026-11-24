import type { H3Event } from 'h3'
import { isCrosswordId, type CrosswordId } from '../../shared/utils/crosswords'
export function crosswordRequestId(event: H3Event): CrosswordId {
  const id = getQuery(event).id
  if (id === undefined || id === '1') return '1'
  if (isCrosswordId(id)) return id
  throw createError({ statusCode: 400, statusMessage: 'Ukendt krydsord.' })
}
