import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const archive = path.dirname(fileURLToPath(import.meta.url))
const destination = path.resolve(process.argv[2] || '.data/market-archive')
const manifest = JSON.parse(fs.readFileSync(path.join(archive, 'manifest.json'), 'utf8'))
fs.mkdirSync(destination, { recursive: true })
for (const file of manifest.files) {
  const stored = fs.readFileSync(path.join(archive, file.stored))
  const data = file.stored.endsWith('.gz') ? gunzipSync(stored) : stored
  if (createHash('sha256').update(data).digest('hex') !== file.sha256)
    throw Error('Archive checksum mismatch: ' + file.original)
  const output = path.join(destination, file.original)
  if (fs.existsSync(output)) {
    if (createHash('sha256').update(fs.readFileSync(output)).digest('hex') !== file.sha256)
      throw Error('Refusing to overwrite a changed file: ' + output)
  } else fs.writeFileSync(output, data)
}
console.log(`Verified and restored ${manifest.files.length} files to ${destination}`)
