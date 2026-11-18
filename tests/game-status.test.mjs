import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import * as vue from 'vue'
import { renderToString } from '@vue/server-renderer'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'

const { descriptor } = parse(readFileSync('app/components/GameStatus.vue', 'utf8'))
const source = compileScript(descriptor, { id: 'game-status', inlineTemplate: true }).content
const exports = {}
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports, require: () => vue },
)

test('finished game status never says Klar, including while refreshing or locked', async () => {
  for (const extra of [{}, { loading: true }, { locked: 'Åbner snart' }, { started: true }]) {
    const html = await renderToString(vue.createSSRApp(exports.default, { done: true, ...extra }))
    assert.match(html, /Spillet i dag ✓/)
    assert.doesNotMatch(html, /Klar|Henter|Åbner snart|I gang/)
  }
})

test('unknown and ongoing game status are distinct from ready', async () => {
  for (const [props, label] of [
    [{ loading: true }, 'Henter…'],
    [{ started: true }, 'I gang'],
    [{ locked: 'Åbner snart' }, 'Åbner snart'],
  ]) {
    const html = await renderToString(vue.createSSRApp(exports.default, props))
    assert.ok(html.includes(label))
  }
})

test('unplayed games have no ready label or empty status pill', async () => {
  const html = await renderToString(vue.createSSRApp(exports.default))
  assert.doesNotMatch(html, /Klar|game-status|<span/)
})
