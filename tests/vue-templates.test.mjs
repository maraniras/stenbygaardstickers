import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@vue/compiler-sfc'

test('all Vue templates parse after formatting, including event handlers', () => {
  const errors = []
  for (const entry of readdirSync('app', { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.vue')) continue
    const path = join(entry.parentPath ?? entry.path, entry.name)
    for (const error of parse(readFileSync(path, 'utf8')).errors)
      errors.push(`${path}: ${error.message}`)
  }
  assert.deepEqual(errors, [])
})
