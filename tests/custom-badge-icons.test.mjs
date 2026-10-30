import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import sharp from 'sharp'
import ts from 'typescript'

const exports={}
vm.runInNewContext(ts.transpileModule(readFileSync('app/utils/badgeIcons.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports})
const ids=['banana-baron','city-guide','city-gps','city-streak','wheel-spins','wheel-streak','wheel-jackpot','city-last','wheel-nits',
  'stickers','year','partner','original','pioneer','favorite',
  'arctic','equator','farthest','live','stardust','comeback',
  'gang','network','roadtrip','longhaul','border','nordic',
  'continent-europa','continent-afrika','continent-asien','continent-nordamerika','continent-sydamerika','continent-oceanien',
  'home','regular','team','cities','countries','capitals',
  'commenter','tagged','likes','hit','viral','fivestar',
  'director','filmstar','author','photographer','magnet','peoples',
  'continents','neighbour','far','world','north','south',
  'spring','summer','autumn','winter','halloween','jul',
  'denmark','birthday','turbo','weekend','streak','paaske','newyear','jubilee',
  'jack-rounds','jack-wins','jack-naturals','jack-doubles','jack-split','jack-back-to-back','jack-five-card','jack-dealer-bust']
test('all 79 custom badge motifs exist, fit retina medals and have real transparency',async()=>{
  for(const id of ids){const file=exports.badgeIcon(id);assert.equal(file,`/badges/custom/${id}.webp`);const image=sharp('public'+file),meta=await image.metadata(),stats=await image.stats();assert.ok(meta.hasAlpha);assert.equal(Math.max(meta.width,meta.height),256);assert.equal(stats.channels.at(-1).min,0)}
})
test('currency banana stays separate and shared badge families resolve to custom art',()=>{
  assert.notEqual(exports.badgeIcon('banana-baron'),'/badges/banana-baron.webp')
  assert.ok(readFileSync('public/badges/banana-baron.webp').length>0)
  assert.equal(exports.badgeIcon('birthday'),'/badges/custom/birthday.webp')
  for(const n of [10,25,50,75,100])assert.equal(exports.badgeIcon(`jubilee-${n}`),'/badges/custom/jubilee.webp')
  assert.equal(exports.badgeIcon('year-2026'),'/badges/custom/year.webp')
  assert.equal(exports.badgeIcon('year-2027'),'/badges/custom/year.webp')
  assert.equal(exports.badgeIcon('denmark'),'/badges/custom/denmark.webp')
})

test('every badge in the fixed numbered catalogue has a custom asset, including aliases',()=>{
  const catalogue=readFileSync('docs/badges.md','utf8').split(/\r?\n/).filter(row=>/^\| x\d+ \|/.test(row)).map(row=>row.match(/`([^`]+)`/))
  assert.equal(catalogue.length,83)
  const files=new Set()
  for(const [,id]of catalogue){const icon=exports.badgeIcon(id.replace('<år>','2026'));assert.ok(icon.startsWith('/badges/custom/'),id);assert.ok(readFileSync('public'+icon).length>0,id);files.add(icon)}
  assert.equal(files.size,79)
})
