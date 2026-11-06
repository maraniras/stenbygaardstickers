import { ADVENT_PRIZES, ADVENT_YEAR } from '../../data/advent'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const wallets = await allEconomyRecords()
  return {
    year: ADVENT_YEAR,
    drafts: ADVENT_PRIZES.map(({ day, published, prize }) => ({ day, published, prize })),
    claims: Object.entries(wallets).flatMap(([name, wallet]) =>
      Object.values(wallet.advent?.[String(ADVENT_YEAR)] ?? {}).map((opening) => ({
        name,
        ...opening,
      })),
    ),
  }
})
