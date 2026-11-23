import { setup } from './economy-harness.mjs'

export function crosswordSetup(remote = false) {
  const h = setup(remote, [
    'server/utils/crossword.ts',
    'shared/utils/profile-frames.ts',
    'shared/utils/profile-banners.ts',
  ])
  h.users = new Map()
  h.api.updateUser = async (key, change) => {
    const user = structuredClone(h.users.get(key) || { name: key, devices: {} })
    change(user)
    h.users.set(key, user)
    return user
  }
  return h
}
