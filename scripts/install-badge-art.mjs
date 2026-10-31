import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Only resize/optimize approved, generated artwork; illustration edits use image_gen.
const sources = process.argv.slice(2)
if (!sources.length)
  throw Error(
    'Angiv en designmappe: node scripts/install-badge-art.mjs docs/designs/legacy-badges-preview-5',
  )
const installed = []
for (const dir of sources) {
  for (const file of await fs.readdir(dir)) {
    if (!file.endsWith('.png') || file === 'oversigt.png') continue
    const id = file.slice(0, -4)
    if (!/^[a-z][a-z0-9-]*$/.test(id)) throw Error('Ugyldigt badge-id: ' + id)
    const source = sharp(path.join(dir, file))
    const metadata = await source.metadata()
    if (!metadata.hasAlpha) throw Error(id + ' mangler alpha')
    await source
      .trim({ threshold: 10 })
      .resize({ width: 232, height: 232, fit: 'inside' })
      .extend({
        top: 12,
        bottom: 12,
        left: 12,
        right: 12,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile('public/badges/custom/' + id + '.webp')
    installed.push(id)
  }
}
console.log('Installeret ' + installed.length + ' motiver: ' + installed.join(', '))
