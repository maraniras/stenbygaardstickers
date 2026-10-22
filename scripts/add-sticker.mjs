// Opretter en ny sticker: slår land/by op ud fra koordinatet, komprimerer medier
// og skriver app/data/stickers/<id>.json.
//
// Brug:
//   node scripts/add-sticker.mjs --lat 48.8584 --lng 2.2945 --title "Eiffeltårnet" \
//     --date 2026-10-22 --by "Mads, Emil" --desc "Tekst..." billede1.jpg video.mov
//
// Valgfrit: --city / --country / --cc overskriver opslaget, --id vælger id,
// --force overskriver en eksisterende sticker.
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const args = process.argv.slice(2)
const opts = {}
const files = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--force') opts.force = true
  else if (a.startsWith('--')) opts[a.slice(2)] = args[++i]
  else files.push(a)
}

for (const k of ['lat', 'lng', 'title']) {
  if (!opts[k]) {
    console.error(`Mangler --${k}`)
    process.exit(1)
  }
}

const lat = Number(opts.lat)
const lng = Number(opts.lng)
const date = opts.date || new Date().toISOString().slice(0, 10)
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('--date skal være YYYY-MM-DD')
  process.exit(1)
}

async function reverseGeocode() {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=da`
  const res = await fetch(url, { headers: { 'User-Agent': 'StenbygaardStickers/1.0 (privat hobbyprojekt)' } })
  if (!res.ok) throw new Error(`Nominatim svarede ${res.status}`)
  const j = await res.json()
  const a = j.address ?? {}
  return {
    city: a.city || a.town || a.village || a.municipality || a.hamlet || a.county || a.state || '',
    country: a.country || '',
    countryCode: (a.country_code || '').toUpperCase(),
  }
}

const geo = (opts.city && opts.country && opts.cc) ? {} : await reverseGeocode()
const city = opts.city || geo.city
const country = opts.country || geo.country
const countryCode = (opts.cc || geo.countryCode || '').toUpperCase()

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const id = opts.id || `${date}-${slug(city || opts.title)}`

const jsonPath = join('app/data/stickers', `${id}.json`)
const mediaDir = join('public/media', id)
if (existsSync(jsonPath) && !opts.force) {
  console.error(`${jsonPath} findes allerede (brug --force eller --id)`)
  process.exit(1)
}
rmSync(mediaDir, { recursive: true, force: true })
mkdirSync(mediaDir, { recursive: true })

const VIDEO = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi', '.3gp'])
const media = []
let n = 0
for (const file of files) {
  n++
  if (VIDEO.has(extname(file).toLowerCase())) {
    const out = join(mediaDir, `${n}.mp4`)
    const poster = join(mediaDir, `${n}-poster.webp`)
    execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', file, '-t', '15',
      '-vf', "scale='min(1080,iw)':-2", '-c:v', 'libx264', '-preset', 'slow', '-crf', '28',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out])
    const frame = execFileSync(ffmpegPath, ['-loglevel', 'error', '-ss', '0.5', '-i', out, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'])
    const meta = await sharp(frame).webp({ quality: 75 }).toFile(poster)
    media.push({ type: 'video', src: `/${out.replace(/\\/g, '/').replace(/^public\//, '')}`, poster: `/${poster.replace(/\\/g, '/').replace(/^public\//, '')}`, width: meta.width, height: meta.height })
  }
  else {
    const out = join(mediaDir, `${n}.webp`)
    const meta = await sharp(file).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(out)
    media.push({ type: 'image', src: `/${out.replace(/\\/g, '/').replace(/^public\//, '')}`, width: meta.width, height: meta.height })
  }
  console.log(`  ${file} → ${media[media.length - 1].src}`)
}
if (!media.length) rmSync(mediaDir, { recursive: true, force: true })

const sticker = {
  id,
  title: opts.title,
  date,
  placedBy: (opts.by || '').split(',').map(s => s.trim()).filter(Boolean),
  lat,
  lng,
  country,
  countryCode,
  city,
  description: opts.desc || '',
  media,
}
writeFileSync(jsonPath, `${JSON.stringify(sticker, null, 2)}\n`)
console.log(`Gemt ${jsonPath} (${city}, ${country})`)
