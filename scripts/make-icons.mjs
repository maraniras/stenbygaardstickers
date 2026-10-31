// Laver favicon, PWA-ikoner og kortnål ud fra logoet.
// Brug: node scripts/make-icons.mjs [sti-til-logo.png]
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const src = process.argv[2] || 'branding/logo.png'
const BG = '#ffd23f'
mkdirSync('public/icons', { recursive: true })

const head = await sharp(src).trim().png().toBuffer()

async function icon(size, file, pad) {
  const inner = Math.round(size * (1 - pad * 2))
  const logo = await sharp(head)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(file)
}

await icon(192, 'public/icons/icon-192.png', 0.08)
await icon(512, 'public/icons/icon-512.png', 0.08)
await icon(512, 'public/icons/maskable-512.png', 0.18)
await icon(180, 'public/icons/apple-touch-icon.png', 0.08)
await icon(48, 'public/favicon.png', 0.04)

// Gennemsigtigt hoved til kortnål og header
await sharp(head)
  .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/marker.png')
await sharp(head)
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/logo.png')

// Notifikations-badge: Android bruger kun formen og farver den hvid, så det skal
// være hovedets silhuet i hvid på gennemsigtig baggrund (ellers bliver det en hvid firkant)
const silhouette = await sharp(head)
  .resize(84, 84, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extractChannel('alpha')
  .toBuffer()
await sharp({ create: { width: 84, height: 84, channels: 3, background: '#ffffff' } })
  .joinChannel(silhouette)
  .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('public/icons/badge-96.png')

console.log('Ikoner lavet i public/')
