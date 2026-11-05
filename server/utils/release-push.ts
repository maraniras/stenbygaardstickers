import { CHANGELOG } from '../../app/utils/changelog'

// 2.2 predates release notifications and must never generate a retrospective push.
const BASELINE = '2.2'
const CLAIM_RELEASE = `
local previous = tonumber(redis.call('GET', KEYS[1]) or ARGV[2])
local next = tonumber(ARGV[1])
if next <= previous then return 0 end
redis.call('SET', KEYS[1], ARGV[1])
return 1
`

export function releaseRank(version: string) {
  if (!/^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/.test(version)) return 0
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  return major * 1_000_000 + minor * 1000 + patch
}

/** Redis claim is shared across cold starts, deployments and simultaneous requests. */
export async function announceRelease() {
  if (process.env.VERCEL_ENV !== 'production' || !redisEnabled) return
  const release = CHANGELOG[0]
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  if (!release?.date || release.date > today) return
  const rank = releaseRank(release.version)
  if (rank <= releaseRank(BASELINE)) return

  // Resolve recipients before claiming, so a storage failure can be retried safely.
  const [publicSubs, users, muted] = await Promise.all([
    allSubs('all'),
    listUsers(),
    mutedEndpoints('updates'),
  ])
  const subs = new Map(publicSubs.map((s) => [s.endpoint, s]))
  for (const user of users)
    for (const device of Object.values(user.devices))
      if (device.push) subs.set(device.push.endpoint, device.push)
  for (const endpoint of muted) subs.delete(endpoint)

  const claimed = await redisEval(
    CLAIM_RELEASE,
    ['push:release:latest'],
    [String(rank), String(releaseRank(BASELINE))],
  )
  if (!claimed) return
  const gone = await sendPush([...subs.values()], {
    title: release.push?.title ?? `🆕 Ny opdatering · Version ${release.version}`,
    body: release.push?.body ?? 'Se hvad der er nyt i appen.',
    url: release.push?.url ?? '/nyheder',
    tag: `app-release-${release.version}`,
  })
  for (const endpoint of gone) await removeSub('all', endpoint)
  const expired = new Set(gone)
  for (const user of users) {
    if (!Object.values(user.devices).some((d) => d.push && expired.has(d.push.endpoint))) continue
    await updateUser(nameKey(user.name), (current) => {
      for (const device of Object.values(current.devices))
        if (device.push && expired.has(device.push.endpoint)) delete device.push
    })
  }
}

let check: Promise<void> | undefined
export function checkReleasePush() {
  check ??= announceRelease().catch((error) => {
    check = undefined
    console.error('Kunne ikke sende appopdatering', error)
  })
  return check
}
