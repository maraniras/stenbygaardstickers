export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', async (event) => {
    const job = checkSeasonalPushSchedule()
    if (typeof event.waitUntil === 'function') event.waitUntil(job)
    else await job
  })
})
