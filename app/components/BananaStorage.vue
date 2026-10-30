<script setup lang="ts">
const props = defineProps<{ balance: number, peak: number, own?: boolean }>()
const store = computed(() => bananaStorage(props.balance))
const id = useId()
const sceneCaption = computed(() => {
  const captions: Record<number, string> = {
    7: 'Emil har nu sin egen eksporthavn.',
    8: 'Nationalbanken vil helst ikke tale om det.',
    9: 'Samlebåndet stopper ikke. Emil har sagt det.',
    10: 'Jorden blev for lille. Emil købte en planet.',
  }
  return captions[store.value.level] ?? (store.value.level >= 6 ? 'Der blev brug for mere plads.' : store.value.level >= 4 ? 'Nu begynder det at ligne noget.' : store.value.amount ? 'Små bananer. Store ambitioner.' : 'Alle imperier starter et sted.')
})
const fmt = (n: number) => n.toLocaleString('da-DK')
</script>
<template>
  <section class="banana-storage" :class="{ cosmic: store.level === 10 }" :aria-label="`${own ? 'Dit bananlager' : 'Bananlager'}: ${fmt(store.amount)} bananer. ${store.stage.name}.`">
    <div class="store-heading"><div><span class="store-label">{{ own ? 'Dit bananlager' : 'Bananlager' }}</span><strong>{{ fmt(store.amount) }}<img src="/badges/banana-baron.webp" alt="bananer"></strong></div><span class="store-stage">{{ store.stage.name }}</span></div>
    <div class="scene" aria-hidden="true">
      <svg v-if="store.level < 7" viewBox="0 0 400 200" class="warehouse">
        <defs><linearGradient :id="`${id}-wall`" x2="0" y2="1"><stop stop-color="#353344"/><stop offset="1" stop-color="#242334"/></linearGradient><linearGradient :id="`${id}-floor`" x2="0" y2="1"><stop stop-color="#4e4144"/><stop offset="1" stop-color="#262534"/></linearGradient><radialGradient :id="`${id}-glow`"><stop stop-color="#fcd681" stop-opacity=".2"/><stop offset="1" stop-color="#fcd681" stop-opacity="0"/></radialGradient></defs>
        <path d="M0 0H400V153H0Z" :fill="`url(#${id}-wall)`"/>
        <path d="M0 153H400V200H0Z" :fill="`url(#${id}-floor)`"/>
        <path d="M0 153H400M43 200 102 153M357 200 298 153M0 179H400" stroke="#a9957920" fill="none"/>
        <ellipse cx="200" cy="173" rx="147" ry="17" fill="#100d2245"/>
        <g v-if="store.level >= 6" fill="none" stroke="#786656" stroke-width="7"><path d="M24 155V38L200 2 376 38V155M24 40H376"/><path v-if="store.level >= 7" d="M94 45V150M306 45V150M25 78H375" stroke="#918477" stroke-width="3"/></g>
        <g v-else stroke="#a08b7b16"><path d="M0 40H400M0 80H400M0 120H400M65 0V153M335 0V153"/></g>
        <ellipse cx="200" cy="70" rx="150" ry="103" :fill="`url(#${id}-glow)`"/>
        <path d="M200 0V19" stroke="#b3a083" stroke-width="2"/><path d="M185 27 192 18H208L215 27Z" fill="#dfbb72"/><path d="M187 28H213" stroke="#ffe8af" stroke-width="3"/>
        <g v-if="store.crates.length === 0"><path d="M63 147H337V156H63Z" fill="#9c7147"/><path d="M70 156V191M330 156V191" stroke="#725036" stroke-width="8"/><path d="M63 147 78 138H322L337 147Z" fill="#bc9061"/>
          <image v-for="b in store.loose" :key="b.index" href="/badges/banana-baron.webp" :x="b.x" :y="b.y" width="35" height="35" :transform="`rotate(${b.angle},${b.x + 17.5},${b.y + 17.5})`" class="banana"/>
          <text v-if="store.amount === 0" x="200" y="120" text-anchor="middle" fill="#a79aab" font-size="11" font-family="inherit">Her er plads til noget stort.</text>
        </g>
        <g v-for="crate in store.crates" :key="crate.index" :transform="`translate(${crate.x},${crate.y})`">
          <path d="M-40 0-25-9 43-1 28 8Z" fill="#4e352d"/>
          <image v-for="b in crate.bananas" :key="b.index" href="/badges/banana-baron.webp" :x="b.x" :y="b.y" width="32" height="32" :transform="`rotate(${b.angle},${b.x + 16},${b.y + 16})`" class="banana"/>
          <path d="M-40 0 28 8V46L-40 38Z" fill="#ac7c4c"/><path d="M28 8 43-1V37L28 46Z" fill="#765031"/>
          <path d="M-40 10 28 18M-40 25 28 33M-33 1V39M21 8V44" stroke="#4f362d" stroke-width="2" opacity=".5"/>
          <path d="M-29 3 17 41M17 9-29 34" stroke="#c79860" stroke-width="5"/>
          <rect x="-18" y="13" width="21" height="16" rx="2" fill="#e9cc8c" transform="rotate(7)"/><image href="/badges/banana-baron.webp" x="-14" y="14" width="15" height="15"/>
        </g>
      </svg>
      <BananaFortuneScene v-else :level="store.level" :count="store.count" />
      <span class="scene-caption">{{ sceneCaption }}</span>
    </div>
    <div class="store-footer"><div v-if="store.next" class="next-stage"><span>{{ fmt(store.next.at - store.amount) }} til <b>{{ store.next.name }}</b></span><progress :value="store.progress" max="1" :aria-label="`Fremskridt mod ${store.next.name}`" /></div><p v-else class="max-stage">Én planet. Kun bananer. Månen er næste mål.</p><div class="store-meta"><span>Højeste saldo: {{ fmt(peak) }}</span><span v-if="own">Se historik <span aria-hidden="true">↗</span></span></div></div>
  </section>
</template>
<style scoped>
.banana-storage { overflow:hidden; border:1px solid #d8bc8533; border-radius:22px; background:#262334; color:#f4eddf; box-shadow:0 7px 22px #15101d18; }.store-heading { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; column-gap:10px; padding:18px 18px 0; }.store-heading > div { display:contents; }.store-label { grid-column:1; grid-row:1; color:#bcb1c5; text-transform:uppercase; font-size:9px; font-weight:700; letter-spacing:.14em; }.store-heading strong { grid-column:1 / -1; grid-row:2; display:flex; align-items:center; gap:5px; margin-top:5px; font-size:32px; font-weight:800; letter-spacing:-.05em; font-variant-numeric:tabular-nums; }.store-heading img { width:30px; height:30px; object-fit:contain; }.store-stage { grid-column:2; grid-row:1; max-width:170px; padding:6px 9px; border:1px solid #dfbd702b; border-radius:8px; background:#d1b97910; color:#e9ce95; font-size:10px; font-weight:700; text-align:right; }.scene { position:relative; margin-top:0; }.warehouse { display:block; width:100%; height:auto; }.banana { filter:drop-shadow(0 2px 1px #21132338); }.scene-caption { display:block; padding:0 12px 10px; color:#d1c2aa; text-align:center; font-size:9px; }.store-footer { padding:14px 18px; border-top:1px solid #ffffff0b; background:#201d2e; }.next-stage > span { display:block; color:#bdb0c7; font-size:10px; }.next-stage b { color:#ead9b3; font-weight:600; }progress { display:block; width:100%; height:4px; margin-top:8px; appearance:none; border:0; border-radius:8px; overflow:hidden; background:#ffffff10; }progress::-webkit-progress-bar { background:#ffffff10; }progress::-webkit-progress-value { border-radius:8px; background:linear-gradient(90deg,#b18b55,#f2d78e); }progress::-moz-progress-bar { border-radius:8px; background:#e4bf79; }.store-meta { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; margin-top:11px; color:#91859e; font-size:9px; }.store-meta > span:last-child:not(:first-child) { color:#dcccaa; }.max-stage { margin:0; color:#ead9b3; font-size:11px; }
.cosmic { background:#17172c; border-color:#e7cb8266; box-shadow:0 0 24px #9279bb20; }.cosmic .store-footer { background:#141426; }.cosmic .store-stage { background:#b89be51c; color:#f0dca6; }
@media(max-width:350px) { .store-heading { padding:15px 14px 0; }.store-heading strong { font-size:28px; }.store-stage { font-size:9px; }.store-footer { padding:12px 14px; } }
</style>
