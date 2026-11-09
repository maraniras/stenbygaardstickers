import { ADVENT_PRIZES, ADVENT_YEAR } from '../../data/advent'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const wallets = await allEconomyRecords()
  const draw = await readAdventDraw()
  return {
    year: ADVENT_YEAR,
    physicalWinners: adventPhysicalWinners(draw, wallets),
    drafts: ADVENT_PRIZES.map(({ day }) => ({ day, published: true })),
    draw: {
      locked: !!draw,
      cutoff: ADVENT_CUTOFF,
      participants: draw?.participants ?? [],
      awards: draw?.awards ?? [],
    },
    claims: Object.entries(wallets).flatMap(([name, wallet]) =>
      Object.values(wallet.advent?.[String(ADVENT_YEAR)] ?? {}).map((opening) => ({
        name,
        ...opening,
      })),
    ),
  }
})
