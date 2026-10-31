export const BANANA_STORAGE_STAGES = [
  { at: 0, name: 'Tomt lager', count: 0 },
  { at: 1, name: 'Den første banan', count: 1 },
  { at: 250, name: 'En lille bunke', count: 6 },
  { at: 1000, name: 'Bananbunke', count: 12 },
  { at: 2500, name: 'En fyldt kasse', count: 20 },
  { at: 5000, name: 'Kasser på stribe', count: 28 },
  { at: 10000, name: 'Emils bananskur', count: 40 },
  { at: 25000, name: 'Bananterminalen', count: 54 },
  { at: 50000, name: 'Bananbanken', count: 70 },
  { at: 100000, name: 'Bananfabrikken', count: 90 },
  { at: 250000, name: 'Emils bananplanet', count: 110 },
] as const

/** Purely cosmetic: current balance controls the scene; it never changes rewards. */
export function bananaStorage(balance: number) {
  const amount = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0
  const level = BANANA_STORAGE_STAGES.filter((s) => amount >= s.at).length - 1
  const stage = BANANA_STORAGE_STAGES[level]!,
    next = BANANA_STORAGE_STAGES[level + 1]
  const progress = next ? (amount - stage.at) / (next.at - stage.at) : 1
  const count = Math.min(
    110,
    stage.count + (next ? Math.floor(progress * (next.count - stage.count)) : 0),
  )
  const crateCount = Math.max(0, level - 3)
  const locations = [
    { x: 104, y: 143 },
    { x: 208, y: 143 },
    { x: 306, y: 143 },
    { x: 152, y: 94 },
    { x: 254, y: 94 },
    { x: 54, y: 94 },
    { x: 348, y: 94 },
  ]
  if (crateCount === 1) locations[0] = { x: 200, y: 143 }
  if (crateCount === 2) {
    locations[0] = { x: 145, y: 143 }
    locations[1] = { x: 255, y: 143 }
  }
  const banana = (index: number, x: number, y: number) => ({
    index,
    x,
    y,
    angle: ((index * 37) % 51) - 25,
  })
  const crates = locations
    .slice(0, crateCount)
    .map((position, index) => ({
      ...position,
      index,
      bananas: Array.from(
        { length: Math.floor(count / crateCount) + (index < count % crateCount ? 1 : 0) },
        (_, i) =>
          banana(index * 31 + i, -37 + (i % 4) * 17 + (i % 3) * 2, -24 - Math.floor(i / 4) * 11),
      ),
    }))
    .sort((a, b) => a.y - b.y)
  const loose = crateCount
    ? []
    : Array.from({ length: count }, (_, i) =>
        banana(
          i,
          185 - (Math.min(8, count - Math.floor(i / 8) * 8) - 1) * 9 + (i % 8) * 18,
          118 - Math.floor(i / 8) * 13,
        ),
      )
  return { amount, level, stage, next, progress, count, crates, loose }
}
