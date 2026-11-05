import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import ts from 'typescript'

const source = readFileSync('nuxt.config.ts', 'utf8').replaceAll(
  'import.meta.url',
  JSON.stringify(pathToFileURL(resolve('nuxt.config.ts')).href),
)
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
for (const [label, env, slotsEnabled] of [
  ['local development', { NODE_ENV: 'development' }, true],
  ['Vercel Preview', { NODE_ENV: 'production', VERCEL_ENV: 'preview' }, true],
  ['Vercel production', { NODE_ENV: 'production', VERCEL_ENV: 'production' }, false],
  ['standalone production', { NODE_ENV: 'production' }, false],
]) {
  test(`casino release defaults in ${label}: Bananjack open, slots ${slotsEnabled ? 'open' : 'coming soon'}`, () => {
    const exports = {}
    vm.runInNewContext(code, {
      exports,
      require: () => ({ fileURLToPath }),
      URL,
      process: { env },
      defineNuxtConfig: (config) => config,
    })
    assert.equal(exports.default.runtimeConfig.public.bananjackEnabled, true)
    assert.equal(exports.default.runtimeConfig.public.banandittenEnabled, slotsEnabled)
  })
}
