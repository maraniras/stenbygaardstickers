import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import * as vue from 'vue'
import { renderToString } from '@vue/server-renderer'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

const { descriptor } = parse(readFileSync('app/components/DailyBoxesBoard.vue', 'utf8'))
const source = compileScript(descriptor, { id: 'boxes-board', inlineTemplate: true }).content
const { api } = setup(false, ['shared/utils/boxes.ts'])
const exports = {}
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports, require: (id) => (id === 'vue' ? vue : api) },
)

const run = {
  choices: [0, 5, 6],
  prizes: [
    { kind: 'bananas', amount: 15 },
    { kind: 'bananas', amount: 10 },
    { kind: 'elf', amount: -40 },
  ],
  nominal: -15,
  amount: -15,
  playedAt: '2026-11-20T08:00:00Z',
}
const render = (extra) =>
  renderToString(
    vue.createSSRApp(exports.default, {
      selected: [],
      run: null,
      flipped: false,
      resultVisible: false,
      locked: false,
      busy: false,
      ...extra,
    }),
  )
test('closed boxes retain all twelve question marks while choosing and during the reveal', async () => {
  for (const props of [{}, { selected: run.choices, run, flipped: true }]) {
    const html = await render(props)
    assert.equal((html.match(/class="box-front"/g) ?? []).length, 12)
  }
})
test('completed and restored results remove question-mark faces from exactly the three opened boxes', async () => {
  const html = await render({
    selected: run.choices,
    run,
    flipped: true,
    resultVisible: true,
    locked: true,
  })
  const buttons = html.match(/<button\b[\s\S]*?<\/button>/g)
  assert.equal(buttons.length, 12)
  for (let i = 0; i < 12; i++) {
    if (run.choices.includes(i)) {
      assert.doesNotMatch(buttons[i], /box-front|<b>\?<\/b>/)
      assert.match(buttons[i], /box-back/)
      assert.match(buttons[i], /<img/)
    } else assert.match(buttons[i], /box-front/)
  }
  assert.equal((html.match(/class="box-front"/g) ?? []).length, 9)
})
