import type { ParcelReward } from '../types/parcel-game'

/** Counts are public; the random mapping from contents to wrapping stays server-only. */
export function parcelRewardPool(count: number): ParcelReward[] {
  if (!count) return []
  if (count < 8) throw new Error('Der skal være mindst fire deltagere.')
  const pool: ParcelReward[] = [
    { kind: 'mix-max', amount: 50, title: 'Mix Max' },
    { kind: 'cake', amount: 50, title: 'Træstammer' },
    { kind: 'faxe-kondi', amount: 50, title: 'Faxe Kondi' },
    { kind: 'frame', amount: 0, title: 'Eksklusiv juleprofilramme' },
    { kind: 'golden', amount: 500, title: 'Den gyldne gave' },
    ...Array.from({ length: Math.max(2, Math.ceil(count * 0.15)) }, () => ({
      kind: 'elf' as const,
      amount: 1,
      title: 'Drillenissens gave',
    })),
  ]
  if (count >= 12)
    pool.push(
      { kind: 'bottle', amount: 50, title: 'Drikkedunk' },
      { kind: 'bottle', amount: 50, title: 'Drikkedunk' },
      { kind: 'snowglobe', amount: 50, title: 'RTA-snekugle' },
    )
  // Two gifts per person: 24 gifts means at least twelve participants.
  if (count >= 24) pool.push({ kind: 'mix-max', amount: 50, title: 'Mix Max' })
  const left = count - pool.length
  const amounts = [25, 50, 100, 150, 250],
    weights = [3, 3, 2, 2, 2]
  const shares = weights.map((w, i) => ({
    i,
    exact: (left * w) / 12,
    count: Math.floor((left * w) / 12),
  }))
  let extra = left - shares.reduce((n, s) => n + s.count, 0)
  for (const share of [...shares].sort(
    (a, b) => b.exact - b.count - (a.exact - a.count) || a.i - b.i,
  )) {
    if (!extra) break
    share.count++
    extra--
  }
  for (const s of shares)
    for (let i = 0; i < s.count; i++)
      pool.push({
        kind: 'bananas',
        amount: amounts[s.i]!,
        title: amounts[s.i]! >= 100 ? 'Bananbunke' : 'Banangave',
      })
  return pool
}
export const isParcelPhysical = (reward: ParcelReward) =>
  ['mix-max', 'bottle', 'snowglobe', 'cake', 'faxe-kondi'].includes(reward.kind)
export function parcelRewardIcon(reward: ParcelReward) {
  if (reward.kind === 'faxe-kondi') return '/games/advent/faxe-kondi-christmas-v1.webp'
  if (reward.kind === 'cake') return '/games/parcels/traestammer.webp'
  if (reward.kind === 'golden') return '/games/parcels/golden-gift.webp'
  if (reward.kind === 'frame') return '/games/parcels/exclusive-frame.webp'
  if (reward.kind === 'snowglobe') return '/games/parcels/rta-snowglobe.webp'
  if (reward.kind === 'mix-max') return '/games/advent/mix-max-christmas-v2.webp'
  if (reward.kind === 'bottle') return '/games/advent/cycling-bottle-christmas-v2.webp'
  if (reward.kind === 'elf') return '/games/advent/mischief-elf.webp'
  return `/games/advent/${reward.amount >= 150 ? 'banana-pile-large' : reward.amount >= 50 ? 'banana-pile-small' : 'banana-single'}-christmas-v2.webp`
}
