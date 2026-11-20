export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', async () => {
    await scheduleOneOffPush()
  })
})
