// Kaldes dagligt af Vercel Cron (se vercel.json). Med CRON_SECRET sat sender Vercel
// den som Bearer-token; uden den tages højst én backup pr. 20 timer, så et
// tilfældigt kald ikke kan fylde lageret op.
export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  if (secret) {
    if (getHeader(event, 'authorization') !== `Bearer ${secret}`) throw createError({ statusCode: 401 })
  }
  else if (!import.meta.dev) {
    const latest = (await listBackups(event))[0]
    if (latest && Date.now() - Date.parse(latest.createdAt) < 20 * 60 * 60 * 1000) {
      return { skipped: true, latest: latest.name }
    }
  }
  return storeBackup(event)
})
