import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false,
  devtools: { enabled: false },
  nitro: {
    // JSON-filerne er startdata, som serveren kopierer ind i databasen (server/utils/stickers.ts)
    serverAssets: [
      {
        baseName: 'thumbnails',
        dir: fileURLToPath(new URL('./server/assets/thumbnails', import.meta.url)),
      },
      { baseName: 'seed', dir: fileURLToPath(new URL('./app/data/stickers', import.meta.url)) },
    ],
  },
  css: ['leaflet/dist/leaflet.css', '~/assets/main.css'],
  app: {
    // Ikke Nuxts standard "/_nuxt/": nogle browsere har gemt en HTML-side under gamle
    // /_nuxt/-filnavne (se server/middleware/missing-assets.ts). Ny mappe = nye adresser.
    buildAssetsDir: '/_app/',
    head: {
      htmlAttrs: { lang: 'da' },
      title: 'Stenbygaard Stickers',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#f4f4f6' },
        { name: 'description', content: 'Kortet over alle Stenbygaard-stickers i verden.' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Stickers' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },
})
