// Service worker – kun til notifikationer. Den gemmer ingenting (ingen fetch-handler),
// så appen altid henter den nyeste version fra serveren.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} }
  catch { data = { body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(data.title || 'Stenbygaard Stickers', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    // Hvid silhuet – Android viser kun formen i statuslinjen
    badge: '/icons/badge-96.png',
    data: { url: data.url || '/admin' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find(w => new URL(w.url).origin === self.location.origin)
    if (open) {
      await open.focus()
      return open.navigate(url)
    }
    return self.clients.openWindow(url)
  })())
})
