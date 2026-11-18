import { createHash } from 'node:crypto'
import type { ActivityItem } from '../../shared/types/activity'
import type { NotifyType } from '../../shared/utils/notify'
import type { UserRecord } from './users'
import type { PushMessage } from './push'

export const ACTIVITY_LIMIT = 100

/** Pure mutation: safe to repeat inside the user's atomic update callback. */
export function addActivity(
  user: UserRecord,
  message: PushMessage,
  type: NotifyType,
  now = new Date(),
) {
  const day = now.toISOString().slice(0, 10)
  const id = createHash('sha256')
    .update(JSON.stringify([day, type, message.tag, message.title, message.body, message.url]))
    .digest('hex')
    .slice(0, 24)
  user.activity ??= []
  if (user.activity.some((item) => item.id === id)) return
  const item: ActivityItem = {
    id,
    type,
    title: message.title,
    body: message.body,
    url:
      message.url.startsWith('/') && !message.url.startsWith('//') && !message.url.includes('\\')
        ? message.url
        : '/mig',
    createdAt: now.toISOString(),
  }
  user.activity = [item, ...user.activity].slice(0, ACTIVITY_LIMIT)
}

export function markActivityRead(user: UserRecord, ids: string[], now = new Date()) {
  const chosen = new Set(ids)
  for (const item of user.activity ?? []) {
    if (chosen.has(item.id) && !item.readAt) item.readAt = now.toISOString()
  }
}

export async function saveActivity(
  key: string,
  messages: { type: NotifyType; message: PushMessage }[],
) {
  if (!messages.length) return
  const now = new Date()
  try {
    await updateUser(key, (user) => {
      for (const { type, message } of messages) addActivity(user, message, type, now)
    })
  } catch (error) {
    console.error('Kunne ikke gemme aktivitet', error)
  }
}
