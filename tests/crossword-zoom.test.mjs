import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, computed, nextTick } from 'vue'

const source = readFileSync('app/components/CrosswordBoard.vue', 'utf8')
const code = source.slice(source.indexOf('const zoom ='), source.indexOf('const loaded ='))
function setup() {
  let api
  const viewport = {
    scrollLeft: 0,
    scrollTop: 0,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 400 }),
    scrollTo({ left, top }) {
      this.scrollLeft = Math.max(0, left)
      this.scrollTop = Math.max(0, top)
    },
  }
  const element = {
    querySelector: () => null,
    getBoundingClientRect: () => {
      const width = 280 * (api?.zoom.value ?? 1),
        height = 300 * (api?.zoom.value ?? 1)
      return {
        left: 10 + Math.max(0, (300 - width) / 2) - viewport.scrollLeft,
        top: 20 + Math.max(0, (400 - height) / 2) - viewport.scrollTop,
        width,
        height,
      }
    },
  }
  const context = vm.createContext({
    ref,
    computed,
    nextTick,
    board: ref(element),
    boardViewport: ref(viewport),
  })
  vm.runInContext(
    ts.transpileModule(
      code + '\n globalThis.api={zoom,zoomLabel,startPinch,movePinch,endPinch,setZoom};',
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    context,
  )
  api = context.api
  const touch = (distance, centerX = 150, centerY = 180) => ({
    touches: [
      { clientX: centerX - distance / 2, clientY: centerY },
      { clientX: centerX + distance / 2, clientY: centerY },
    ],
    cancelable: true,
    prevented: false,
    preventDefault() {
      this.prevented = true
    },
  })
  return { ...api, viewport, touch }
}
test('pinch prevents page zoom, scales just the board and preserves the point between fingers', async () => {
  const a = setup(),
    start = a.touch(100),
    move = a.touch(200)
  a.startPinch(start)
  await a.movePinch(move)
  assert.equal(start.prevented, true)
  assert.equal(move.prevented, true)
  assert.equal(a.zoom.value, 2)
  assert.equal(a.viewport.scrollLeft, 120)
  assert.ok(Math.abs(a.viewport.scrollTop - 60) < 0.001)
  await a.movePinch(a.touch(500))
  assert.equal(a.zoom.value, 3)
  await a.movePinch(a.touch(10))
  assert.equal(a.zoom.value, 1)
})
test('zoom buttons override fractional and queued gesture zoom; one-finger scrolling stays native', async () => {
  const a = setup()
  const one = {
    touches: [{ clientX: 20, clientY: 20 }],
    cancelable: true,
    preventDefault() {
      throw Error('single-finger scrolling blocked')
    },
  }
  a.startPinch(one)
  a.startPinch(a.touch(100))
  await a.movePinch(a.touch(160))
  assert.equal(a.zoomLabel.value, '1.6×')
  const pending = a.movePinch(a.touch(220))
  await a.setZoom(1)
  await pending
  assert.equal(a.zoom.value, 1)
  assert.equal(a.viewport.scrollLeft, 0)
  await a.movePinch(a.touch(290))
  assert.equal(a.zoom.value, 1)
  await a.setZoom(2)
  assert.equal(a.zoom.value, 2)
  await a.setZoom(3)
  assert.equal(a.zoom.value, 3)
})
test('board disables native pinch at all scales and successful saving takes no vertical space', () => {
  assert.match(source, /\.board-scroll\s*\{[^}]*touch-action: pan-x pan-y;/)
  assert.doesNotMatch(source, /touch-action:[^;]*pinch-zoom/)
  assert.doesNotMatch(source, /Gemt på denne enhed/)
  assert.doesNotMatch(source, /class="preview-note"/)
  const page = readFileSync('app/pages/spil/krydsord.vue', 'utf8')
  assert.match(page, /v-if="view.winner && !view.preview"/)
  assert.doesNotMatch(page, /Første korrekte løsning vinder/)
})
