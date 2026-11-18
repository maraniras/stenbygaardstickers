import type { NotifyType } from '../utils/notify'

export interface ActivityItem {
  id: string
  type: NotifyType
  title: string
  body: string
  url: string
  createdAt: string
  readAt?: string
}
