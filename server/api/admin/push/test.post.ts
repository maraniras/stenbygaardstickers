/** Sender en prøve-notifikation til alle admins */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await notify('admin', {
    title: 'Det virker! 🎉',
    body: 'Du får besked her, når nogen indsender en sticker.',
    url: '/admin',
  })
  return { ok: true }
})
