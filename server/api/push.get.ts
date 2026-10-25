/** Offentlig nøgle og om denne telefon får besked om nye stickers */
export default defineEventHandler(async (event) => {
  const { endpoint } = getQuery(event)
  return {
    publicKey: await vapidPublicKey(),
    subscribed: typeof endpoint === 'string' ? await hasSub('all', endpoint) : false,
  }
})
