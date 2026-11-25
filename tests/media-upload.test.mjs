import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, reactive, watch, effectScope } from 'vue'

function editor(upload) {
  const model = ref([]),
    busy = ref(false),
    cleanup = [],
    scope = effectScope()
  const context = vm.createContext({
    ref,
    reactive,
    watch,
    Map,
    Error,
    defineModel: (arg) => (arg === 'busy' ? busy : model),
    defineEmits: () => () => {},
    onBeforeUnmount: (fn) => cleanup.push(fn),
    photoDate: async () => undefined,
    uploadMedia: upload,
  })
  const script = readFileSync('app/components/MediaEditor.vue', 'utf8').match(
    /<script setup lang="ts">([\s\S]*?)<\/script>/,
  )[1]
  scope.run(() =>
    vm.runInContext(
      ts.transpileModule(script + '\nglobalThis.api={onFiles,retry,dismiss,jobs}', {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText,
      context,
    ),
  )
  return {
    ...context.api,
    model,
    busy,
    unmount: () => {
      cleanup.forEach((fn) => fn())
      scope.stop()
    },
  }
}

test('a failed camera upload blocks submission and retry uses the same retained file', async () => {
  const file = { name: 'camera.jpg', type: 'image/jpeg' },
    calls = []
  const e = editor(async (f) => {
    calls.push(f)
    if (calls.length === 1) throw Error('Network error')
    return { type: 'image', src: '/saved.webp' }
  })
  const target = { files: [file], value: 'camera.jpg' }
  await e.onFiles({ target })
  assert.equal(target.value, '')
  assert.equal(e.model.value.length, 0)
  assert.equal(e.busy.value, true)
  assert.equal(e.jobs.value[0].error, 'Network error')
  await e.retry(e.jobs.value[0])
  assert.equal(calls.length, 2)
  assert.equal(calls[0], calls[1])
  assert.equal(e.model.value[0].src, '/saved.webp')
  assert.equal(e.busy.value, false)
  e.unmount()
})

test('other successes cannot hide a failed file; it must be retried or explicitly removed', async () => {
  const e = editor(async (f) => {
    if (f.name === 'bad.jpg') throw Error('Failed')
    return { type: 'image', src: '/good.webp' }
  })
  await e.onFiles({
    target: {
      files: [
        { name: 'bad.jpg', type: 'image/jpeg' },
        { name: 'good.jpg', type: 'image/jpeg' },
      ],
      value: '',
    },
  })
  assert.equal(e.model.value.length, 1)
  assert.equal(e.busy.value, true)
  e.dismiss(e.jobs.value[0])
  assert.equal(e.busy.value, false)
  e.unmount()
})

test('leaving the form cannot attach a late upload to another form or account', async () => {
  let finish
  let markStarted
  const started = new Promise((resolve) => {
    markStarted = resolve
  })
  const e = editor(
    () =>
      new Promise((resolve) => {
        finish = resolve
        markStarted()
      }),
  )
  const request = e.onFiles({
    target: { files: [{ name: 'camera.jpg', type: 'image/jpeg' }], value: '' },
  })
  await started
  e.unmount()
  finish({ type: 'image', src: '/late.webp' })
  await request
  assert.equal(e.model.value.length, 0)
})

function uploader(extra = {}) {
  const exports = {},
    context = vm.createContext({
      exports,
      console,
      URL,
      Image: class {},
      require: () => ({}),
      ...extra,
    })
  vm.runInContext(
    ts.transpileModule(readFileSync('app/utils/upload.ts', 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  )
  return { api: exports, context }
}

test('camera photos with empty MIME are accepted by filename without accepting arbitrary files', async () => {
  const { api, context } = uploader()
  const file = { name: 'CAPTURE.JPG', type: '' }
  assert.equal(api.isImageFile(file), true)
  assert.equal(api.isImageFile({ name: 'IMG.HEIC', type: 'application/octet-stream' }), true)
  assert.equal(api.isImageFile({ name: 'notes.txt', type: '' }), false)
  let closed = 0
  context.loadImage = async () => ({ source: {}, w: 4000, h: 3000, done: () => closed++ })
  context.encode = async () => ({ blob: {}, ext: 'webp', width: 1600, height: 1200 })
  context.send = async () => '/camera.webp'
  const media = await api.uploadMedia(file)
  assert.equal(media.src, '/camera.webp')
  assert.equal(media.width, 1600)
  assert.equal(closed, 1)
})

test('Safari decode errors release the temporary camera object URL', async () => {
  const revoked = []
  const { context } = uploader({
    createImageBitmap: async () => {
      throw Error('unsupported')
    },
    URL: { createObjectURL: () => 'blob:camera', revokeObjectURL: (url) => revoked.push(url) },
    Image: class {
      async decode() {
        throw Error('decode failed')
      }
    },
  })
  await assert.rejects(context.loadImage({ name: 'camera.heic' }), /decode failed/)
  assert.deepEqual(revoked, ['blob:camera'])
})
