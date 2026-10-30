import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'
const harness=remote=>setup(remote,['server/utils/bananjack.ts']).api
const context={stickers:[],ratings:{},comments:{}}
const now=new Date('2026-10-30T18:00:00Z')
const deck=(...cards)=>[...cards,...Array(100).fill(9)]
const badges=(a,r)=>a.badgesFor('Test',[],{},{history:true,now,economy:{test:a.publicEconomy(r)}}).filter(b=>b.id.startsWith('jack-'))
const fresh=a=>{const r=a.freshEconomy();a.settleEconomy(r,'Test',context,now);return r}
const settle=(a,r)=>a.settleEconomy(r,'Test',context,now)

test('all eight badges are visible when missing; first natural pays once with dates and points',()=>{
  const a=harness(false),r=fresh(a)
  assert.equal(badges(a,r).length,8);assert.equal(badges(a,r).filter(b=>b.earned).length,0)
  a.dealJack(r,'round-a',null,10,deck(0,8,9,7));settle(a,r)
  assert.equal(r.balance,305);assert.equal(r.jackStats.rounds,1);assert.equal(r.jackStats.wins,1);assert.equal(r.jackStats.naturals,1);assert.equal(r.jackStats.net,15)
  const earned=badges(a,r).filter(b=>b.earned);assert.equal(earned.length,3);assert.equal(a.totalPoints(earned),3)
  for(const b of earned){assert.equal(b.earnedAt,'2026-10-30');assert.equal(b.steps[0].reachedAt,'2026-10-30')}
  const original=JSON.stringify(r);settle(a,r);a.dealJack(r,'round-a',null,10);assert.equal(JSON.stringify(r),original)
})
test('natural pushes count, two consecutive naturals unlock once, losses break the current streak',()=>{
  const a=harness(false),r=fresh(a)
  a.dealJack(r,'round-a',null,10,deck(0,0,9,9));settle(a,r)
  assert.equal(r.jackStats.naturals,1);assert.equal(r.jackStats.wins,0);assert.equal(r.balance,280)
  a.dealJack(r,'round-b','round-a',10,deck(0,8,9,7));settle(a,r)
  assert.equal(r.jackStats.bestNaturalStreak,2);assert.equal(r.claims['badge:jack-back-to-back'],true)
  const bonus=r.history.filter(t=>t.id==='badge:jack-back-to-back');assert.equal(bonus.length,1);assert.equal(bonus[0].amount,100)
  a.dealJack(r,'round-c','round-b',10,deck(9,9,5,7));a.actJack(r,'round-c',0,'stand');settle(a,r)
  assert.equal(r.jackStats.naturalStreak,0);assert.equal(r.jackStats.bestNaturalStreak,2)
})
test('double wins, low-score dealer busts and five-card 21 unlock the correct rewards',()=>{
  const a=harness(false)
  const doubled=fresh(a);a.dealJack(doubled,'round-a',null,20,deck(4,8,5,7,9));a.actJack(doubled,'round-a',0,'double');settle(a,doubled)
  assert.equal(doubled.jackStats.doubleWins,1);assert.equal(doubled.balance,325);assert.equal(doubled.claims['badge:jack-doubles:1'],true)
  const bust=fresh(a);a.dealJack(bust,'round-a',null,10,deck(4,9,9,5,9));a.actJack(bust,'round-a',0,'stand');settle(a,bust)
  assert.equal(bust.jackStats.dealerBustWins,1);assert.equal(bust.balance,305);assert.equal(bust.claims['badge:jack-dealer-bust'],true)
  const five=fresh(a);a.dealJack(five,'round-a',null,10,deck(1,9,2,6,3,4,58));for(let i=0;i<3;i++)a.actJack(five,'round-a',i,'hit');settle(a,five)
  assert.equal(five.jackStats.fiveCard21,1);assert.equal(five.balance,355);assert.equal(five.claims['badge:jack-five-card'],true)
})
test('one split counts two won hands and one round, never a natural; resplits do not satisfy single split',()=>{
  const a=harness(false),r=fresh(a);a.dealJack(r,'round-a',null,10,deck(0,8,52,7,9,61));a.actJack(r,'round-a',0,'split');settle(a,r)
  assert.equal(r.jackStats.rounds,1);assert.equal(r.jackStats.wins,2);assert.equal(r.jackStats.naturals,0);assert.equal(r.jackStats.splitWins,1);assert.equal(r.balance,340)
  const other=fresh(a);other.bananjack={...r.bananjack,id:'other',hands:[...r.bananjack.hands,{...r.bananjack.hands[0]}]};a.syncJackStats(other);assert.equal(other.jackStats.splitWins,0)
})
test('saved finished round migrates once, inferred legacy double is safe, missing history is not invented',()=>{
  const a=harness(false),r=fresh(a);a.dealJack(r,'legacy',null,20,deck(4,8,5,7,9));a.actJack(r,'legacy',0,'double')
  delete r.jackStats;delete r.bananjack.hands[0].doubled;r.bananjack.sequence=87
  settle(a,r);assert.equal(r.jackStats.rounds,1);assert.equal(r.jackStats.doubleWins,1);assert.equal(r.jackStats.countedSequence,87)
  const balance=r.balance;settle(a,r);assert.equal(r.balance,balance);assert.equal(r.jackStats.rounds,1)
  const publicData=a.publicEconomy(r);assert.equal(publicData.jack.countedSequence,undefined);assert.equal(publicData.jack.naturalStreak,undefined);assert.equal(publicData.bananjack,undefined)
  const active=fresh(a);a.dealJack(active,'active',null,10,deck(7,8,6,7));settle(a,active);assert.equal(active.jackStats,undefined)
})
test('all milestones pay the exact agreed 1920 bananas and 70 points, incrementally and once',()=>{
  const a=harness(false),r=fresh(a)
  r.jackStats={rounds:500,wins:250,naturals:100,doubleWins:75,splitWins:1,bestNaturalStreak:2,fiveCard21:1,dealerBustWins:1,net:0,countedSequence:500,naturalStreak:0}
  settle(a,r)
  const claims=r.history.filter(t=>t.id.startsWith('badge:jack-'));assert.equal(claims.length,24);assert.equal(claims.reduce((n,t)=>n+t.amount,0),1920)
  const all=badges(a,r);assert.equal(a.totalPoints(all),70);assert.equal(a.earnedKeys(all).length,24)
  const balance=r.balance;settle(a,r);assert.equal(r.balance,balance)
  const incremental=fresh(a);incremental.jackStats={...r.jackStats,rounds:1,wins:0,naturals:0,doubleWins:0,splitWins:0,bestNaturalStreak:0,fiveCard21:0,dealerBustWins:0};settle(a,incremental)
  incremental.jackStats.rounds=10;settle(a,incremental);assert.equal(incremental.balance,280);assert.equal(a.totalPoints(badges(a,incremental)),3)
})
for(const remote of [false,true])test(`stats and badge rewards commit once under concurrent settlement (${remote?'Redis CAS':'local'})`,async()=>{
  const a=harness(remote);await a.mutateEconomy('Test',r=>settle(a,r))
  await Promise.all(Array.from({length:10},()=>a.mutateEconomy('Test',r=>{settle(a,r);a.dealJack(r,'round-a',null,10,deck(0,8,9,7));settle(a,r)})))
  let r=await a.readEconomy('Test');assert.equal(r.balance,305);assert.equal(r.jackStats.rounds,1);assert.equal(r.history.filter(t=>t.id.startsWith('badge:jack-')).length,3)
  await Promise.all(Array.from({length:10},()=>a.mutateEconomy('Test',r=>settle(a,r))))
  r=await a.readEconomy('Test');assert.equal(r.balance,305);assert.equal(r.jackStats.rounds,1)
})
