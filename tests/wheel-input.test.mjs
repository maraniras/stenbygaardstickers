import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { ref, reactive, watch, effectScope, nextTick } from 'vue'

const source=readFileSync('app/components/WheelInput.vue','utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
function setup(enabled=true){
  const props=reactive({enabled,rotation:0,spinning:false}),capture=new Set(),scope=effectScope();let spins=0
  const element={getBoundingClientRect:()=>({left:0,top:0,width:300,height:300}),setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id)}
  const context=vm.createContext({ref,watch,defineProps:()=>props,defineEmits:()=>()=>{spins++;props.enabled=false;props.spinning=true},onBeforeUnmount:()=>{}})
  scope.run(()=>vm.runInContext(code+'\nglobalThis.api={down,move,up,lost,click,dragging,offset};',context))
  const event=(x,y,extra={})=>({clientX:x,clientY:y,pointerId:1,isPrimary:true,button:0,currentTarget:element,...extra})
  return {...context.api,props,capture,event,get spins(){return spins},stop:()=>scope.stop()}
}
test('tap and keyboard activate the same spin once; completed/disabled wheel cannot start',()=>{
  for(const keyboard of [false,true]){const a=setup();if(!keyboard){a.down(a.event(150,30));a.up(a.event(150,30))}a.click({detail:keyboard?0:1});a.click({detail:1});assert.equal(a.spins,1);assert.equal(a.capture.size,0);a.stop()}
  const a=setup(false);a.down(a.event(300,150));a.move(a.event(150,300));a.up(a.event(150,300));a.click({detail:0});assert.equal(a.spins,0);a.stop()
})
test('deliberate pull follows the finger and starts only on release; no duplicate compatibility click',()=>{
  const a=setup();a.down(a.event(299,150));a.move(a.event(150,299));assert.ok(a.offset.value>80 && a.offset.value<100);assert.equal(a.spins,0)
  a.up(a.event(150,299));assert.equal(a.spins,1);assert.equal(a.capture.size,0);a.click({detail:1,pointerType:'touch'});assert.equal(a.spins,1)
  a.props.rotation=3600;return nextTick().then(()=>{assert.equal(a.offset.value,0);a.stop()})
})
test('short movement, cancelled pointers and lost capture never spend the daily attempt',()=>{
  for(const mode of ['short','cancel','capture']){const a=setup();a.down(a.event(299,150));a.move(a.event(mode==='short'?285:200,170));if(mode==='short')a.up(a.event(285,170));else a.lost(a.event(200,170));a.click({detail:1,pointerType:'touch'});assert.equal(a.spins,0);assert.equal(a.offset.value,0);assert.equal(a.capture.size,0);a.stop()}
})
test('ignores secondary pointers, wraps angles safely and cancels when availability changes',async()=>{
  const a=setup();a.down(a.event(0,151));a.down(a.event(299,150,{pointerId:2,isPrimary:false}));a.move(a.event(0,149));assert.ok(Math.abs(a.offset.value)<2)
  a.up(a.event(299,150,{pointerId:2}));assert.equal(a.dragging.value,true);assert.equal(a.spins,0)
  a.props.enabled=false;await nextTick();assert.equal(a.dragging.value,false);assert.equal(a.capture.size,0);assert.equal(a.spins,0);a.stop()
})
