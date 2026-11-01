/** Offentlig nøgle, enhedens abonnement og anonyme notifikationsvalg. */
export default defineEventHandler(async (event) => {
  const { endpoint } = getQuery(event)
  return {
    publicKey: await vapidPublicKey(),
    subscribed: typeof endpoint === 'string' ? await hasSub('all', endpoint) : false,
    notify: typeof endpoint === 'string' ? ((await publicPushPrefs())[endpoint] ?? {}) : {},
  }
})
