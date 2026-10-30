import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref, computed } from 'vue'
const transpile=path=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const planner={};vm.runInNewContext(transpile('app/utils/jackFrames.ts'),{exports:planner})
function round(overrides={}){return {id:'round-a',sequence:1,revision:0,status:'playing',dealer:[8,null],hands:[{cards:[0,9],bet:10,fromSplit:false,status:'playing'}],active:0,staked:10,payout:0,actions:['hit','stand'],...overrides}}
function animator(reduced=false){
  const timers=[],unmount=[],exports={}
  vm.runInNewContext(transpile('app/composables/useJackPresentation.ts'),{exports,require:()=>planner,ref,useState:()=>ref(false),onBeforeUnmount:fn=>unmount.push(fn),window:{matchMedia:()=>({matches:reduced})},setTimeout:(fn,ms)=>{const t={fn,ms,cancelled:false};timers.push(t);return t},clearTimeout:t=>{if(t)t.cancelled=true}})
  return {...exports.useJackPresentation(),timers,unmount:()=>unmount.forEach(f=>f())}
}
test('opening deal alternates player/dealer/player/dealer, without early scores or result',()=>{
  const next=round(),original=JSON.stringify(next),frames=planner.jackFrames(null,next)
  assert.deepEqual(Array.from(frames.slice(0,5),f=>[f.game.hands[0].cards.length,f.game.dealer.length]),[[0,0],[1,0],[1,1],[2,1],[2,2]])
  assert.equal(frames[4].game.dealer[1],null);assert.equal(JSON.stringify(next),original)
  assert.ok(frames.slice(0,-1).every(f=>f.game.actions.length===0))
})
test('natural is revealed only after four dealt cards and dealer flip',()=>{
  const next=round({status:'finished',dealer:[8,7],payout:25,hands:[{cards:[0,9],bet:10,fromSplit:false,status:'stood',result:'blackjack',payout:25}],actions:[]})
  const frames=planner.jackFrames(null,next)
  assert.ok(frames.slice(0,-1).every(f=>f.game.status==='playing'&&!f.game.hands[0].result&&f.game.payout===0))
  assert.equal(frames[4].game.dealer[1],null);assert.equal(frames[5].game.dealer[1],7);assert.equal(frames.at(-1).game.status,'finished')
})
test('one hit does not replay existing cards; dealer reveals then draws one at a time before result',()=>{
  const previous=round({hands:[{cards:[7,5],bet:10,fromSplit:false,status:'playing'}]})
  const next=round({revision:1,status:'finished',dealer:[8,4,2],hands:[{cards:[7,5,6],bet:10,fromSplit:false,status:'stood',result:'win',payout:20}],payout:20,actions:[]})
  const frames=planner.jackFrames(previous,next)
  assert.equal(frames[0].game.hands[0].cards.length,3);assert.equal(frames[0].game.dealer[1],null)
  assert.equal(frames[1].game.dealer.length,2);assert.equal(frames[1].game.dealer[1],4)
  assert.equal(frames[2].game.dealer.length,3);assert.equal(frames[2].game.status,'playing');assert.equal(frames[3].game.status,'finished')
})
test('split moves the original pair and then deals only the new cards',()=>{
  const previous=round({hands:[{cards:[7,59],bet:10,fromSplit:false,status:'playing'}]})
  const next=round({revision:1,staked:20,hands:[{cards:[7,2],bet:10,fromSplit:true,status:'playing'},{cards:[59,5],bet:10,fromSplit:true,status:'playing'}]})
  const frames=planner.jackFrames(previous,next)
  assert.deepEqual(Array.from(frames[0].game.hands,h=>Array.from(h.cards)),[[7],[59]])
  assert.deepEqual(Array.from(frames[1].game.hands,h=>h.cards.length),[2,1]);assert.deepEqual(Array.from(frames[2].game.hands,h=>h.cards.length),[2,2])
})
test('reduced motion and restored hands display instantly; cancellation never reveals old result',async()=>{
  const reduced=animator(true);await reduced.present(round(),true);assert.equal(reduced.timers.length,0);assert.equal(reduced.animating.value,false)
  const a=animator();await a.present(round(),false);assert.equal(a.timers.length,0)
  const running=a.present(round({sequence:2,id:'round-b'}),true);assert.equal(a.animating.value,true)
  a.reset();assert.equal(await running,false);assert.equal(a.shown.value,null);assert.equal(a.animating.value,false);assert.ok(a.timers.every(t=>t.cancelled))
  const after=a.present(round(),true);a.unmount();assert.equal(await after,false);assert.equal(await a.present(round(),true),false)
})
test('animation stays locked through final dealer card and settles once timers finish',async()=>{
  const a=animator(),next=round({status:'finished',dealer:[8,7],payout:10,actions:[]})
  const running=a.present(next,true)
  while(a.timers.length){assert.equal(a.animating.value,true);assert.equal(a.shown.value.status,'playing');const t=a.timers.shift();t.fn();await new Promise(setImmediate)}
  assert.equal(await running,true);assert.equal(a.animating.value,false);assert.equal(a.shown.value.status,'finished')
})

test('page holds payout balance and confetti until animation finishes, never replaying a restored result',async()=>{
  const shown=ref(null),shots=[],pending=[]
  const context=vm.createContext({exports:{},require:()=>({}),ref,computed,watch:()=>{},useHead:()=>{},onMounted:()=>{},onBeforeUnmount:()=>{},
    useUser:()=>({name:ref('Test'),ready:ref(false)}),useEconomy:()=>({}),
    useJackPresentation:()=>({shown,animating:ref(false),caption:ref(''),reset:()=>{},present:(next,animated)=>animated?new Promise(resolve=>pending.push({next,resolve})):Promise.resolve((shown.value=next,true))}),
    shootConfetti:async size=>shots.push(size)})
  const script=readFileSync('app/pages/spil/bananjack.vue','utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const code=ts.transpileModule(script,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  vm.runInContext(code+'\nglobalThis.api={accept,shownBalance};',context)
  const a=context.api
  await a.accept({game:round(),balance:90},false)
  const won=round({revision:1,status:'finished',payout:25})
  const animation=a.accept({game:won,balance:115},true)
  assert.equal(a.shownBalance.value,90);assert.equal(shots.length,0)
  shown.value=pending[0].next;pending[0].resolve(true);await animation
  assert.equal(a.shownBalance.value,115);assert.equal(shots.length,1)
  await a.accept({game:won,balance:115},true);await a.accept({game:won,balance:115},false);assert.equal(shots.length,1)
  const cancelled=a.accept({game:{...won,id:'round-b',sequence:2},balance:140},true)
  pending[1].resolve(false);await cancelled;assert.equal(a.shownBalance.value,115);assert.equal(shots.length,1)
})
