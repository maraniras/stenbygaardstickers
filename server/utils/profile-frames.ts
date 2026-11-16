import { ownedProfileFrames, type ProfileFrameInventory } from '../../shared/utils/profile-frames'
import type { UserRecord } from './users'

export function frameInventory(user: UserRecord): ProfileFrameInventory {
  const owned = ownedProfileFrames(user)
  return { owned, equipped: user.frame && owned.includes(user.frame) ? user.frame : null }
}

/** Runs inside updateUser's CAS, checking ownership against the latest account. */
export function equipProfileFrame(user: UserRecord, input: unknown) {
  const owned = ownedProfileFrames(user)
  if (input !== null && (typeof input !== 'string' || !owned.includes(input)))
    throw createError({ statusCode: 403, statusMessage: 'Du ejer ikke den profilramme.' })
  user.ownedFrames = owned
  if (input === null) delete user.frame
  else user.frame = input as string
}
