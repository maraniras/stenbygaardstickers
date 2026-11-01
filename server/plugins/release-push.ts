// First real request after deployment starts the broadcast in the background.
// waitUntil keeps Vercel's function alive after responding to the visitor.
export default defineNitroPlugin((app) => {
  app.hooks.hook('request', (event) => {
    if (process.env.VERCEL_ENV === 'production') event.waitUntil(checkReleasePush())
  })
})
