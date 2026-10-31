import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const publicRoot = resolve('public')
const output = resolve('server/assets/thumbnails')
await mkdir(output, { recursive: true })
for (const name of await readdir('app/data/stickers')) {
  if (!name.endsWith('.json')) continue
  const sticker = JSON.parse(await readFile(resolve('app/data/stickers', name), 'utf8'))
  const media = sticker.media?.[0]
  const src = media?.type === 'video' ? media.poster : media?.src
  if (!src?.startsWith('/media/')) continue
  const source = resolve(publicRoot, '.' + src)
  if (!source.startsWith(publicRoot + sep)) throw Error('Invalid thumbnail source')
  for (const width of [160, 320, 640]) {
    const hash = createHash('sha256').update(`${src}:${width}`).digest('hex')
    const image = await sharp(await readFile(source))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer()
    await writeFile(resolve(output, hash + '.webp'), image)
  }
}
