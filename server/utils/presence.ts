const PRESENCE_MS = 75_000
let localQueue = Promise.resolve()

/** One field per tab: hiding one tab must not hide another visible tab. */
export async function setDevicePresence(hash: string, tab: string, visible: boolean) {
  const key = `user-presence:${hash}`
  if (redisEnabled) {
    if (visible)
      await redis([
        ['HSET', key, tab, Date.now() + PRESENCE_MS],
        ['EXPIRE', key, Math.ceil(PRESENCE_MS / 1000)],
      ])
    else await redis([['HDEL', key, tab]])
    return
  }
  const job = localQueue.then(async () => {
    const storage = useStorage('data')
    const tabs = (await storage.getItem<Record<string, number>>(key)) ?? {}
    for (const [id, until] of Object.entries(tabs)) if (until <= Date.now()) delete tabs[id]
    if (visible) tabs[tab] = Date.now() + PRESENCE_MS
    else delete tabs[tab]
    await storage.setItem(key, tabs)
  })
  localQueue = job.catch(() => {})
  await job
}

export async function visibleDeviceHashes(user: UserRecord) {
  const hashes = Object.keys(user.devices)
  if (!hashes.length) return new Set<string>()
  let expiries: (string | number)[][]
  if (redisEnabled)
    expiries = (await redis(hashes.map((hash) => ['HVALS', `user-presence:${hash}`]))) as string[][]
  else {
    await localQueue
    expiries = await Promise.all(
      hashes.map(async (hash) =>
        Object.values(
          (await useStorage('data').getItem<Record<string, number>>(`user-presence:${hash}`)) ?? {},
        ),
      ),
    )
  }
  return new Set(
    hashes.filter((_, index) => expiries[index]?.some((until) => Number(until) > Date.now())),
  )
}
