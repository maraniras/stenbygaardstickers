import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

function bounds(lat, lng, width) {
  const radians = (lat * Math.PI) / 180
  return {
    x: (6378137 * lng * Math.PI) / 180,
    y: 6378137 * Math.log(Math.tan(Math.PI / 4 + radians / 2)),
    half: width / Math.cos(radians) / 2,
  }
}
function tileHelper(fetcher) {
  const requests = []
  const context = vm.createContext({
    exports: {},
    Buffer,
    Math,
    Number,
    Promise,
    Error,
    require: () => sharp,
    $fetch: async (url, options) => {
      requests.push({ url, options })
      return fetcher(url)
    },
  })
  vm.runInContext(
    ts.transpileModule(readFileSync('server/utils/city-aerial.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText,
    context,
  )
  return { render: context.exports.cityAerialTiles, requests }
}
function indices(url) {
  const match = /\/tile\/(\d+)\/(\d+)\/(\d+)$/.exec(url)
  assert.ok(match)
  return match.slice(1).map(Number)
}
const colour = (row, col) => ({ r: (col % 200) + 20, g: (row % 200) + 20, b: 100 })

test('tile fallback preserves centre, scale and output size at every game zoom', async () => {
  for (const width of [800, 4000, 20000, 100000, 500000]) {
    const view = bounds(57, 9.9, width)
    const helper = tileHelper((url) => {
      const [, row, col] = indices(url)
      return sharp({
        create: { width: 256, height: 256, channels: 3, background: colour(row, col) },
      })
        .png()
        .toBuffer()
    })
    const image = await helper.render(view)
    const meta = await sharp(image).metadata()
    assert.equal(meta.width, 700)
    assert.equal(meta.height, 490)
    assert.equal(meta.format, 'jpeg')
    assert.ok(helper.requests.length > 0 && helper.requests.length <= 12)
    const [zoom] = indices(helper.requests[0].url)
    const circumference = 2 * Math.PI * 6378137
    const scale = (256 * 2 ** zoom) / circumference
    const expected = colour(
      Math.floor(((circumference / 2 - view.y) * scale) / 256),
      Math.floor(((view.x + circumference / 2) * scale) / 256),
    )
    const centre = await sharp(image)
      .extract({ left: 350, top: 245, width: 1, height: 1 })
      .raw()
      .toBuffer()
    assert.ok(Math.abs(centre[0] - expected.r) <= 3)
    assert.ok(Math.abs(centre[1] - expected.g) <= 3)
    for (const request of helper.requests) {
      assert.equal(request.options.timeout, 8000)
      assert.equal(request.options.retry, 0)
    }
  }
})

test('tile fallback wraps the date line and rejects bad bounds or missing tiles', async () => {
  const tile = await sharp({
    create: { width: 256, height: 256, channels: 3, background: '#548575' },
  })
    .jpeg()
    .toBuffer()
  const helper = tileHelper(async () => tile)
  await helper.render(bounds(-18.1, 178.4, 500000))
  const columns = helper.requests.map((r) => indices(r.url))
  assert.ok(columns.some(([zoom, , col]) => col === 2 ** zoom - 1))
  assert.ok(columns.some(([, , col]) => col === 0))
  for (const [zoom, row, col] of columns) {
    assert.ok(row >= 0 && row < 2 ** zoom)
    assert.ok(col >= 0 && col < 2 ** zoom)
  }
  await assert.rejects(helper.render({ x: NaN, y: 0, half: 400 }))
  await assert.rejects(helper.render({ x: 0, y: 0, half: -1 }))
  const unavailable = tileHelper(async () => {
    throw Error('unavailable')
  })
  await assert.rejects(unavailable.render(bounds(57, 9.9, 800)))
})
