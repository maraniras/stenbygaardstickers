// En JS/CSS-fil fra appens build-mappe, som ikke findes i denne version (fx lige mens
// Vercel skifter version), må ikke få appens HTML-side som svar. Nuxt sætter
// "cache i et år" på alt i build-mappen, så browseren ville gemme HTML'en under
// JS-filens navn og aldrig kunne starte appen igen. Svar 404 uden cache i stedet.
// Findes filen, serveres den statisk før denne middleware når hertil.
export default defineEventHandler((event) => {
  if (import.meta.dev) return
  const path = event.path.split('?')[0] ?? ''
  if (!path.startsWith('/_app/') && !path.startsWith('/_nuxt/')) return
  setHeader(event, 'Cache-Control', 'no-store')
  throw createError({ statusCode: 404, statusMessage: 'Filen findes ikke i denne version' })
})
