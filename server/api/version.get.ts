/** Den udgivne versions build-id – appen sammenligner med sit eget for at se, om der er en ny */
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return { id: useRuntimeConfig(event).app.buildId }
})
