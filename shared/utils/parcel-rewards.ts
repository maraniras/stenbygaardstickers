import type { ParcelReward } from '../types/parcel-game'

/** Counts are public; the random mapping from contents to wrapping stays server-only. */
export function parcelRewardPool(count: number): ParcelReward[] {
  if (!count) return []
  if (count < 12) throw new Error('Der skal være mindst fire deltagere.')
  const elves = Math.max(2, Math.ceil(count * 0.15)) - (count >= 21 && count <= 30 ? 1 : 0)
  const pool: ParcelReward[] = [
    { kind: 'mix-max', amount: 50, title: 'Mix Max' },
    { kind: 'cake', amount: 50, title: 'Træstammer' },
    { kind: 'faxe-kondi', amount: 50, title: 'Faxe Kondi' },
    { kind: 'vampiri', amount: 50, title: 'Haribo Vampiri' },
    { kind: 'juleskum', amount: 50, title: 'Juleskum' },
    { kind: 'rta-mug', amount: 50, title: 'RTA-kop' },
    { kind: 'frame', amount: 50, title: 'Eksklusiv juleprofilramme' },
    { kind: 'golden', amount: 500, title: 'Den gyldne gave' },
    ...Array.from({ length: elves }, () => ({
      kind: 'elf' as const,
      amount: 1,
      title: 'Drillenissens gave',
    })),
  ]
  pool.push(
    { kind: 'bottle', amount: 50, title: 'Drikkedunk' },
    { kind: 'bottle', amount: 50, title: 'Drikkedunk' },
  )
  // Three gifts per participant: snowglobe at 7+, wine at 9+, second Mix Max at 12+.
  if (count >= 21) pool.push({ kind: 'snowglobe', amount: 50, title: 'RTA-snekugle' })
  if (count >= 27) pool.push({ kind: 'white-wine', amount: 50, title: 'Hvidvin' })
  if (count >= 36) pool.push({ kind: 'mix-max', amount: 50, title: 'Mix Max' })
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
  [
    'mix-max',
    'bottle',
    'snowglobe',
    'cake',
    'faxe-kondi',
    'vampiri',
    'juleskum',
    'white-wine',
    'rta-mug',
  ].includes(reward.kind)
export function parcelRewardIcon(reward: ParcelReward) {
  if (reward.kind === 'rta-mug') return '/games/advent/rta-mug-christmas-v2.webp'
  if (reward.kind === 'juleskum') return '/games/advent/juleskum-christmas-v1.webp'
  if (reward.kind === 'white-wine') return '/games/advent/white-wine-christmas-v2.webp'
  if (reward.kind === 'vampiri') return '/games/advent/vampiri-christmas-v1.webp'
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
