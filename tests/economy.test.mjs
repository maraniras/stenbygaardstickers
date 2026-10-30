import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function setup(redisEnabled = false) {
  const storage = new Map(), hashes = new Map(), strings = new Map(), modules = new Map()
  const context = vm.createContext({ Buffer, console, setTimeout, clearTimeout, Date, Intl, redisEnabled,
    createError: v => Object.assign(new Error(v.statusMessage), v), nameKey: n => n.toLocaleLowerCase('da'),
    useStorage: () => ({ getItem: async k => { const v=storage.get(k); if(typeof v==='string' && v.startsWith('{')) return JSON.parse(v); return v }, setItem: async (k,v) => storage.set(k,v), getKeys: async p => [...storage.keys()].filter(k => k.startsWith(p)) }),
    redis: async commands => commands.map(([cmd,key,...args]) => {
      if (cmd === 'HGET') return hashes.get(key)?.get(args[0]) ?? null
      if (cmd === 'HGETALL') return [...(hashes.get(key)?.entries() ?? [])].flat()
      if (cmd === 'GET') return strings.get(key) ?? null
      if (cmd === 'SET') { if (args.includes('NX') && strings.has(key)) return null; strings.set(key,args[0]); return 'OK' }
      throw Error(cmd)
    }),
    redisEval: async (_script,keys,args) => {
      // Atomic Redis server-side compare-and-set, with competing readers before it.
      let hash = hashes.get(keys[0]); if (!hash) hashes.set(keys[0],hash = new Map())
      if ((hash.get(args[0]) ?? '') !== args[1]) return 0
      hash.set(args[0],args[2]); return 1
    },
  })
  function load(file) {
    const path = resolve(file)
    if (modules.has(path)) return modules.get(path)
    if (path.endsWith('.json')) return JSON.parse(readFileSync(path,'utf8'))
    const exports = {}; modules.set(path,exports)
    const code = ts.transpileModule(readFileSync(path,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
    const req = id => {
      if (!id.startsWith('.')) return createRequire(path)(id)
      const target = resolve(dirname(path),id)
      return load(existsSync(target) ? target : target + '.ts')
    }
    vm.runInContext(`(function(exports,require){${code}\n})`,context)(exports,req)
    Object.assign(context,exports)
    return exports
  }
  for (const f of ['shared/utils/sticker.ts','shared/utils/continents.ts','shared/utils/capitals.ts','shared/utils/seasons.ts','shared/utils/badges.ts','shared/utils/economy.ts','shared/utils/game-day.ts','server/utils/economy-store.ts','server/utils/economy.ts','server/utils/daily-challenge.ts','server/utils/daily-games.ts']) load(f)
  return { api:context, storage, hashes }
}
const empty = { stickers: [], ratings:{}, comments:{} }
const at = day => new Date(`${day}T12:00:00Z`)

test('Danish 04:00 boundary includes 23/25-hour DST days', () => {
  const {api:a} = setup()
  for (const [time,day,reset] of [
    ['2026-10-29T02:59:59Z','2026-10-28','2026-10-29T03:00:00.000Z'],
    ['2026-10-29T03:00:00Z','2026-10-29','2026-10-30T03:00:00.000Z'],
    ['2026-03-28T03:00:00Z','2026-03-28','2026-03-29T02:00:00.000Z'],
    ['2026-10-24T02:00:00Z','2026-10-24','2026-10-25T03:00:00.000Z'],
  ]) { assert.equal(a.gameDay(new Date(time)),day); assert.equal(a.nextGameReset(new Date(time)),reset) }
})
test('sticker curve, exact wheel probabilities and expected value', () => {
  const {api:a} = setup()
  assert.equal(a.stickerBananas('DK',18000),250)
  for (const [km,value] of [[0,500],[1000,750],[2000,1250],[3000,1900],[4000,2500],[6000,3750],[8000,5000],[20000,5000]]) assert.equal(a.stickerBananas('IT',km),value)
  const counts = new Map(); let sum = 0
  for (let i=0;i<10000;i++) { const p=a.wheelPrizeFor(i); counts.set(p,(counts.get(p)??0)+1); sum+=p }
  assert.deepEqual([...counts.values()],[3500,1000,3000,1800,500,150,50]); assert.equal(sum/10000,14.1)
  assert.throws(()=>a.wheelPrizeFor(10000))
})
test('welcome, old badge tiers, pioneers and approved stickers settle once per person', () => {
  const {api:a} = setup(); const r=a.freshEconomy()
  a.settleEconomy(r,'Mathias',empty,at('2026-10-29')); assert.equal(r.balance,250)
  const sticker={id:'one',title:'Rom',date:'2026-10-19',lat:41.89,lng:12.49,city:'Rom',country:'Italien',countryCode:'IT',placedBy:['Mathias','Nicole'],description:'Emil',media:[],distanceKm:3000}
  const ctx={...empty,stickers:[sticker]}
  a.settleEconomy(r,'Mathias',ctx,at('2026-10-29'))
  const total=r.balance, count=r.history.length
  assert.equal(r.history.find(x=>x.id==='sticker:one').amount,1900)
  assert.equal(r.history.find(x=>x.id==='pioneer:IT').amount,60)
  assert.ok(!r.history.some(x=>['badge:farthest','badge:north','badge:south','badge:favorite','badge:year-2026'].includes(x.id)))
  a.settleEconomy(r,'Mathias',ctx,at('2026-10-30')); assert.equal(r.balance,total); assert.equal(r.history.length,count)
  const other=a.freshEconomy(); a.settleEconomy(other,'Nicole',ctx,at('2026-10-29')); assert.equal(other.history.find(x=>x.id==='sticker:one').amount,1900)
  a.settleEconomy(r,'Mathias',ctx,new Date('2026-12-31T23:00:00Z')); assert.equal(r.history.find(x=>x.id==='badge:year-2026').amount,200)
  const prior=r.balance; a.settleEconomy(r,'Mathias',ctx,at('2027-01-02')); assert.equal(r.balance,prior)
})
for (const remote of [false,true]) test(`concurrent credits and game submissions commit once (${remote?'Redis CAS':'local queue'})`, async () => {
  const {api:a}=setup(remote),day='2026-10-29',now=at(day)
  await Promise.all(Array.from({length:8},()=>a.mutateEconomy('Test',r=>a.settleEconomy(r,'Test',empty,now))))
  assert.equal((await a.readEconomy('test')).balance,250)
  await Promise.all(Array.from({length:8},()=>a.mutateEconomy('Test',r=>a.applyWheelSpin(r,day,'Test',empty,now,()=>9999))))
  let r=await a.readEconomy('test'); assert.equal(r.balance,1050); assert.equal(r.stats.wheelSpins,1); assert.equal(r.stats.wheelJackpots,1)
  assert.equal(r.history.filter(t=>t.id===`wheel:${day}`).length,1)
  await Promise.all(Array.from({length:8},()=>a.mutateEconomy('Test',r=>a.applyCityGuess(r,day,'correct','correct','Test',empty,now))))
  r=await a.readEconomy('test'); assert.equal(r.stats.cityWins,1); assert.equal(r.stats.cityFirstWins,1); assert.equal(r.days[day].city.guesses.length,1)
  assert.equal(r.balance,1140) // 50 base + first-win 20 + first-guess 20
  assert.equal(Object.keys(await a.allEconomyRecords()).length,1)
  const publicData=a.publicEconomy(r); assert.equal(publicData.history,undefined); assert.equal(publicData.claims,undefined); assert.equal(publicData.days,undefined)
})
test('five attempts, duplicate guesses, retry, streak gaps, one banana is not a nit', () => {
  const {api:a}=setup(); const r=a.freshEconomy(), day='2026-10-29', now=at(day)
  for(const choice of ['a','a','b','c','d','correct']) a.applyCityGuess(r,day,choice,'correct','Test',empty,now)
  assert.equal(r.days[day].city.guesses.length,5); assert.equal(r.days[day].city.reward,10); assert.equal(r.stats.cityLastWins,1)
  a.applyCityGuess(r,day,'extra','correct','Test',empty,now); assert.equal(r.days[day].city.guesses.length,5)
  assert.throws(()=>a.applyWheelSpin(r,day,'Test',empty,at('2026-10-30')),e=>e.statusCode===409)
  for(const d of ['2026-10-29','2026-10-30','2026-10-31']) a.applyWheelSpin(r,d,'Test',empty,at(d),()=>0)
  assert.equal(r.stats.wheelStreak,3); assert.equal(r.stats.bestNitStreak,3); assert.ok(r.claims['badge:wheel-nits'])
  a.applyWheelSpin(r,'2026-11-02','Test',empty,at('2026-11-02'),()=>3500)
  assert.equal(r.stats.wheelStreak,1); assert.equal(r.stats.nitStreak,0); assert.equal(r.stats.bestWheelStreak,3)
})
test('shared daily challenge: all six options avoid previous 20 days; answers hidden until finish', async () => {
  const {api:a}=setup(); const days=[]
  for(let i=0;i<65;i++) { const day=new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10); const challenge=await a.dailyChallenge(day)
    assert.equal(challenge.options.length,6); const ids=challenge.options.map(c=>c.id)
    assert.equal(new Set(ids).size,6)
    for(const previous of days.slice(-20)) assert.ok(!previous.some(id=>ids.includes(id)))
    days.push(ids); assert.equal((await a.dailyChallenge(day)).answer.id,challenge.answer.id)
  }
  const day=a.gameDay(), r=a.freshEconomy(); let response=await a.dailyResponse(r,day)
  assert.equal(response.city.answer,undefined); assert.equal(response.city.options[0].lat,undefined)
  a.applyCityGuess(r,day,response.city.options[0].id,(await a.dailyChallenge(day)).answer.id,'Test',empty)
  response=await a.dailyResponse(r,day); assert.equal(!!response.city.answer,response.city.finished)
})
test('new game badges use explicit rewards, wealth gives no XP and higher tiers are incremental', () => {
  const {api:a}=setup(),r=a.freshEconomy(); a.settleEconomy(r,'Test',empty)
  r.stats.cityWins=250; r.stats.cityFirstWins=50; r.stats.bestCityStreak=100
  r.stats.wheelSpins=365; r.stats.bestWheelStreak=100; r.stats.wheelJackpots=1; r.stats.cityLastWins=1; r.stats.bestNitStreak=3
  a.settleEconomy(r,'Test',empty); const before=r.balance
  a.settleEconomy(r,'Test',empty); assert.equal(r.balance,before)
  const badges=a.badgesFor('Test',[],{},{economy:{test:a.publicEconomy(r)}})
  assert.equal(badges.find(b=>b.id==='banana-baron').points,0)
  assert.equal(badges.find(b=>b.id==='city-guide').points,15)
  assert.equal(badges.find(b=>b.id==='city-gps').name,'Local Legend')
  assert.equal(r.history.find(t=>t.id==='badge:city-guide:5').amount,320)
})
test('Preview EVAL prefixes keys only and preserves Lua/arguments', async () => {
  let sent
  const exports={}; const context=vm.createContext({exports,process:{env:{KV_REST_API_URL:'https://test.invalid',KV_REST_API_TOKEN:'test',VERCEL_ENV:'preview'}},$fetch:async(_url,opts)=>{sent=opts.body;return [{result:1}]} })
  const code=ts.transpileModule(readFileSync('server/utils/redis.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  vm.runInContext(code,context); assert.equal(await exports.redisEval('lua',['economy'],['user','old','new']),1)
  assert.equal(JSON.stringify(sent),JSON.stringify([['EVAL','lua',1,'dev:economy','user','old','new']]))
})
test('equal visual wheel slots always land on the server prize, including repeated Miv slots', () => {
  const exports={}
  const {api:a}=setup()
  const context=vm.createContext({exports,require:()=>({WHEEL_PRIZES:a.WHEEL_PRIZES})})
  const code=ts.transpileModule(readFileSync('app/utils/wheel.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInContext(code,context)
  const slots=exports.WHEEL_SLOTS
  assert.equal(slots.length,20); assert.equal(slots.filter(s=>s.value===0).length,7)
  assert.ok(slots.every((s,i)=>s.end-s.start===18 && s.start===i*18))
  for(const prize of a.WHEEL_PRIZES) {
    const visited=new Set()
    for(let i=0;i<100;i++) {
      const angle=(360-exports.wheelTarget(prize.value,i/100))%360
      const slot=slots.find(s=>angle>=s.start && angle<s.end)
      assert.equal(slot.value,prize.value); visited.add(slot.index)
    }
    assert.equal(visited.size,slots.filter(s=>s.value===prize.value).length)
  }
  assert.equal(exports.WHEEL_SPIN_MS,6500)
  for(const {value} of a.DAILY_JACKPOTS) assert.equal(exports.wheelTarget(value),exports.wheelTarget(500))
})

test('daily jackpot distribution is exact, peaks at 500 and preserves spin odds', () => {
  const {api:a}=setup(); const amounts=new Map(); let total=0
  for(let i=0;i<10000;i++){const v=a.dailyJackpotFor(i);amounts.set(v,(amounts.get(v)??0)+1);total+=v}
  assert.deepEqual([...amounts.keys()],[400,450,500,550,600,650,700,750,800,850,900,1000])
  assert.deepEqual([...amounts.values()],[800,1800,3200,2000,1000,500,300,150,100,70,50,30])
  assert.equal(total/10000,529.2)
  assert.equal([...amounts.values()].reduce((n,v)=>n+v,0),10000)
  for(const {value} of a.DAILY_JACKPOTS){let jackpots=0;for(let i=0;i<10000;i++)jackpots+=Number(a.wheelPrizeFor(i,value)===value);assert.equal(jackpots,50)}
  assert.throws(()=>a.wheelPrizeFor(9999,1000000))
})
for(const remote of [false,true]) test(`daily jackpot persists and is shared across users (${remote?'Redis':'local'})`,async()=>{
  const {api:a}=setup(remote),day=a.gameDay();const values=await Promise.all(Array.from({length:12},()=>a.dailyWheelJackpot(day)))
  assert.equal(new Set(values).size,1)
  assert.ok(a.DAILY_JACKPOTS.some(p=>p.value===values[0]))
  const alice=await a.dailyResponse(a.freshEconomy(),day),bob=await a.dailyResponse(a.freshEconomy(),day)
  assert.equal(alice.wheelJackpot,bob.wheelJackpot);assert.equal(alice.wheelJackpot,values[0])
  for(let i=0;i<50;i++){const d=new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10);assert.equal(await a.dailyWheelJackpot(d),await a.dailyWheelJackpot(d))}
})
test('variable jackpot credits and badge are atomic; past results never change with the next amount',()=>{
  const {api:a}=setup(),r=a.freshEconomy(),day='2026-10-30'
  a.settleEconomy(r,'Test',empty,at(day))
  a.applyWheelSpin(r,day,'Test',empty,at(day),()=>9999,400)
  assert.equal(r.balance,900);assert.equal(r.stats.wheelJackpots,1);assert.equal(r.days[day].wheel.jackpot,true)
  assert.equal(r.days[day].wheel.jackpotAmount,400)
  a.applyWheelSpin(r,day,'Test',empty,at(day),()=>9999,1000)
  assert.equal(r.balance,900);assert.equal(r.days[day].wheel.prize,400)
  a.applyWheelSpin(r,'2026-10-31','Test',empty,at('2026-10-31'),()=>9999,1000)
  assert.equal(r.balance,1950);assert.equal(r.stats.wheelJackpots,2)
  assert.equal(r.history.filter(t=>t.id==='badge:wheel-jackpot').length,1)
  assert.equal(r.days[day].wheel.prize,400)
})
