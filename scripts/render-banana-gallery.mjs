// Render the actual Vue artwork with example balances; never touches account data.
// node scripts/render-banana-gallery.mjs [output.html]
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { parse, compileScript, compileStyle } from '@vue/compiler-sfc'
import { createSSRApp, computed, useId } from 'vue'
import { renderToString } from '@vue/server-renderer'

const require = createRequire(import.meta.url)
const model = {}
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText
vm.runInNewContext(transpile(await fs.readFile('app/utils/bananaStorage.ts', 'utf8')), {
  exports: model,
})
let css = ''
async function component(file, scope) {
  const { descriptor } = parse(await fs.readFile(file, 'utf8'))
  const script = compileScript(descriptor, {
    id: scope,
    inlineTemplate: true,
    templateOptions: { transformAssetUrls: false },
  })
  const module = { exports: {} }
  vm.runInNewContext(transpile(script.content), {
    exports: module.exports,
    module,
    require,
    computed,
    useId,
    bananaStorage: model.bananaStorage,
  })
  const result = module.exports.default
  result.__scopeId = scope
  css += compileStyle({ source: descriptor.styles[0].content, id: scope, scoped: true }).code
  return result
}
const storage = await component('app/components/BananaStorage.vue', 'data-v-store')
const fortune = await component('app/components/BananaFortuneScene.vue', 'data-v-fortune')
let cards = ''
for (const [i, stage] of model.BANANA_STORAGE_STAGES.entries()) {
  const app = createSSRApp(storage, { balance: stage.at, peak: stage.at })
  app.config.idPrefix = `store-${i}`
  app.component('BananaFortuneScene', fortune)
  cards += `<article><div class="sample-label"><span>${String(i + 1).padStart(2, '0')}</span><b>${stage.at.toLocaleString('da-DK')} ${stage.at === 1 ? 'banan' : 'bananer'}</b></div>${await renderToString(app)}</article>`
}
let html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alle 11 bananlagre</title><style>*{box-sizing:border-box}body{margin:0;background:#161320;color:#f5eddf;font-family:Arial,sans-serif;padding:32px}header{margin:0 0 24px}h1{margin:8px 0;font-size:30px;letter-spacing:-1px}header p{margin:0;color:#b8adc5;font-size:13px}.eyebrow{color:#e8c68d;font-size:10px;letter-spacing:2px;text-transform:uppercase}.gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 18px;max-width:1100px}.sample-label{display:flex;align-items:center;gap:9px;margin-bottom:9px;font-size:12px}.sample-label span{color:#9b8ba9;font-size:10px}.sample-label b{font-weight:600}${css}@media(max-width:700px){body{padding:18px}.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:430px){.gallery{grid-template-columns:1fr}}</style></head><body><header><span class="eyebrow">Stenbygaard Stickers</span><h1>Fra første banan til en hel planet.</h1><p>Alle 11 visuelle trin ved deres startsaldo. Lageret fyldes gradvist mellem trinnene.</p></header><main class="gallery">${cards}</main></body></html>`
for (const [file, type] of [
  ['/badges/banana-baron.webp', 'image/webp'],
  ['/marker.png', 'image/png'],
])
  html = html.replaceAll(
    file,
    `data:${type};base64,${(await fs.readFile(`public${file}`)).toString('base64')}`,
  )
const output = process.argv[2] ?? '.data/banana-gallery.html'
await fs.mkdir(path.dirname(output), { recursive: true })
await fs.writeFile(output, html)
console.log(`Rendered ${model.BANANA_STORAGE_STAGES.length} actual storage stages to ${output}`)
