// Link-forhåndsvisninger (Messenger, SMS, Slack …). Appen kører kun i browseren
// (ssr: false), og de tjenester kører ikke JavaScript – så serveren skriver
// og:-tags ind i HTML'en: stickerens titel, sted og billede på /sticker/<id>,
// ellers en generel tekst med logoet.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const SITE = 'Stenbygaard Stickers'
const SITE_DESC = 'Kortet over alle Stenbygaard-stickers i verden.'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html, { event }) => {
    const url = getRequestURL(event)
    let title = SITE
    let description = SITE_DESC
    let image = `${url.origin}/logo.png`
    let large = false

    const m = url.pathname.match(/^\/sticker\/([a-z0-9-]{1,80})\/?$/)
    if (m) {
      const s = await getStored(m[1]!).catch(() => undefined)
      if (s?.status === 'approved') {
        title = `${s.title} · ${SITE}`
        const place = [s.city, s.country].filter(Boolean).join(', ')
        const text = s.description.length > 160 ? `${s.description.slice(0, 157).trimEnd()}…` : s.description
        description = [place, text].filter(Boolean).join(' – ')
        const thumb = s.media[0] && (s.media[0].type === 'video' ? s.media[0].poster : s.media[0].src)
        if (thumb) {
          image = thumb.startsWith('http') ? thumb : `${url.origin}${thumb}`
          large = true
        }
      }
    }

    html.head.push([
      `<meta property="og:site_name" content="${SITE}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:url" content="${esc(url.origin + url.pathname)}">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(description)}">`,
      `<meta property="og:image" content="${esc(image)}">`,
      `<meta name="twitter:card" content="${large ? 'summary_large_image' : 'summary'}">`,
    ].join(''))
  })
})
