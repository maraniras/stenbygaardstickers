export function releaseRank(version: string) {
  if (!/^\d{1,3}\.\d{1,3}(\.\d{1,3}){0,2}$/.test(version)) return 0
  const [major = 0, feature = 0, minor = 0, hotfix = 0] = version.split('.').map(Number)
  // Preserve persisted ranks from the old model; W sorts between consecutive minor releases.
  return major * 1_000_000 + feature * 1000 + minor + hotfix / 1000
}
/** X: major, Y: substantial feature, Z: minor, W: silent hotfix.
 * Historical three-part patch releases retain their original silent behaviour. */
export function isHotfixRelease(version: string) {
  if (!releaseRank(version)) return false
  const parts = version.split('.').map(Number)
  return parts.length === 4 ? parts[3]! > 0 : (parts[2] ?? 0) > 0
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
