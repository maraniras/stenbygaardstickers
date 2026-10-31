import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, watch, nextTick } from 'vue'
function setup(storage = new Map()) {
  const exports = {},
    unmount = []
  const code = ts.transpileModule(readFileSync('app/composables/useSavedDraft.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, {
    exports,
    ref,
    watch,
    setTimeout,
    clearTimeout,
    onMounted: (fn) => fn(),
    onBeforeUnmount: (fn) => unmount.push(fn),
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  })
  return { ...exports, storage, unmount: () => unmount.forEach((fn) => fn()) }
}
test('drafts restore edits after leaving and stay isolated by account and sticker', async () => {
  const a = setup(),
    key = ref('comment:nicole:one'),
    d = a.useSavedDraft(key, () => '')
  d.draft.value = 'Ufærdig kommentar'
  await nextTick()
  d.save()
  key.value = 'comment:mathias:one'
  assert.equal(d.draft.value, '')
  d.draft.value = 'Anden bruger'
  await nextTick()
  d.save()
  key.value = 'comment:nicole:one'
  assert.equal(d.draft.value, 'Ufærdig kommentar')
  a.unmount()
  const b = setup(a.storage),
    restored = b.useSavedDraft(ref('comment:nicole:one'), () => '')
  assert.equal(restored.draft.value, 'Ufærdig kommentar')
  assert.equal(restored.restored.value, true)
  b.unmount()
})
test('successful submissions clear drafts without restoring them during unmount', () => {
  const a = setup(new Map([['upload', '{"title":"Kladde"}']])),
    d = a.useSavedDraft(ref('upload'), () => ({ title: '' }))
  d.clear()
  a.unmount()
  assert.equal(a.storage.has('upload'), false)
})
test('invalid JSON and unavailable storage do not stop editing', () => {
  const a = setup(new Map([['upload', '{broken']])),
    d = a.useSavedDraft(ref('upload'), () => ({ title: '' }))
  assert.equal(d.draft.value.title, '')
  a.unmount()
})
