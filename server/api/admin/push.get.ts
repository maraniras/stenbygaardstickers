/** Den offentlige nøgle browseren skal bruge, og om denne telefon allerede får besked */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const { endpoint } = getQuery(event)
  return {
    publicKey: await vapidPublicKey(),
    subscribed: typeof endpoint === 'string' ? await hasSub(endpoint) : false,
  }
})
