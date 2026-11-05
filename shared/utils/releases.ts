export function releaseRank(version: string) {
  if (!/^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/.test(version)) return 0
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  return major * 1_000_000 + minor * 1000 + patch
}
/** Drafts and future releases are never announced. Danish dates match the changelog. */
export function latestPublishedRelease<T extends { version: string; date?: string }>(
  releases: T[],
  now = new Date(),
): T | undefined {
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return releases
    .filter((release) => release.date && release.date <= today && releaseRank(release.version))
    .sort((a, b) => releaseRank(b.version) - releaseRank(a.version))[0]
}
