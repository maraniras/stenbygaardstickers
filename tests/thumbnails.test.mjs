import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import sharp from 'sharp'

test('all seed thumbnails are bundled at their requested widths', async () => {
  for (const file of readdirSync('app/data/stickers').filter((name) => name.endsWith('.json'))) {
    const sticker = JSON.parse(readFileSync('app/data/stickers/' + file, 'utf8')),
      media = sticker.media[0]
    const src = media.type === 'video' ? media.poster : media.src
    if (!src?.startsWith('/media/')) continue
    for (const width of [160, 320, 640]) {
      const hash = createHash('sha256').update(`${src}:${width}`).digest('hex')
      const result = await sharp(readFileSync(`server/assets/thumbnails/${hash}.webp`)).metadata()
      assert.equal(result.width, width)
      assert.equal(result.format, 'webp')
    }
  }
})
test('thumbnail proxy rejects relative traversal and non-approved stickers before fetching', async () => {
  const exports = {}
  let sticker
  const code = ts.transpileModule(
    readFileSync('server/api/stickers/[id]/thumbnail.get.ts', 'utf8'),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    },
  ).outputText
  vm.runInNewContext(code, {
    exports,
    require: createRequire(import.meta.url),
    defineEventHandler: (fn) => fn,
    getRouterParam: () => 'valid-id',
    STICKER_RE: /^[a-z-]+$/,
    getStored: async () => sticker,
    isOwnMedia: () => true,
    createError: (value) => Object.assign(Error(), value),
    useStorage: () => {
      throw Error('Must reject before storage/fetch')
    },
  })
  for (const src of [
    '/media/../api/cron/backup',
    '/media/%2e%2e/api/cron/backup',
    '/media/file.webp?x=1',
    '/api/admin/backup',
  ]) {
    sticker = { status: 'approved', media: [{ type: 'image', src }] }
    await assert.rejects(exports.default({}), { statusCode: 404 })
  }
  sticker = { status: 'pending', media: [{ type: 'image', src: '/media/photo.webp' }] }
  await assert.rejects(exports.default({}), { statusCode: 404 })
})
