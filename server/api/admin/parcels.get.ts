export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const [games, wallets] = await Promise.all([parcelBackup(), allEconomyRecords()])
  return { campaigns: parcelAdminCampaigns(games, wallets) }
})
