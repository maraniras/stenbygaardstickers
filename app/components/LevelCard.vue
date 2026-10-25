<script setup lang="ts">
// Level 1–10 på profilen: ring der fyldes op mod næste level, titel og point.
// Tryk for at se alle levels.
const props = defineProps<{ points: number }>()
const open = ref(false)

const lv = computed(() => levelFor(props.points))
const pct = computed(() => {
  const { next, at, points } = lv.value
  return next ? Math.min(100, Math.round((points - at) / (next.at - at) * 100)) : 100
})
</script>

<template>
  <button class="level" :aria-expanded="open" @click="open = !open">
    <span class="ring" :style="{ '--pct': `${pct}%` }">
      <span class="inner"><small>Level</small>{{ lv.level }}</span>
    </span>
    <span class="info">
      <b>{{ lv.title }}</b>
      <span>{{ lv.points }} point</span>
      <span v-if="lv.next" class="to-next">{{ lv.next.at - lv.points }} point til {{ lv.next.title }}</span>
      <span v-else class="to-next">Højeste level nået 🎉</span>
    </span>
    <svg class="chev" :class="{ open }" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
  </button>

  <ol v-if="open" class="levels">
    <li v-for="(l, i) in LEVELS" :key="l.at" :class="{ done: lv.level > i, current: lv.level === i + 1 }">
      <span class="n">{{ i + 1 }}</span>
      <span class="t">{{ l.title }}</span>
      <span class="p">{{ l.at }} p</span>
    </li>
  </ol>
</template>

<style scoped>
.level {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  margin-top: 16px;
  padding: 14px 16px;
  border: 0;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.ring {
  flex: none;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) var(--pct), var(--surface-2) 0);
}
.inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--surface);
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}
.inner small {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--muted);
}
.info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.info b { font-size: 18px; }
.info span { font-size: 14px; color: var(--muted); }
.info .to-next { font-size: 13px; font-weight: 600; color: var(--text); }
.chev { flex: none; width: 20px; height: 20px; fill: none; stroke: var(--muted); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s; }
.chev.open { transform: rotate(180deg); }
.levels {
  margin: 8px 0 0;
  padding: 8px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  list-style: none;
}
.levels li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 12px;
  color: var(--muted);
}
.levels li.done { color: var(--text); }
.levels li.current { background: var(--accent-soft); font-weight: 700; }
.n {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--surface-2);
  font-size: 12px;
  font-weight: 800;
}
.done .n { background: var(--accent); color: var(--on-accent); }
.t { flex: 1; }
.p { font-size: 13px; font-variant-numeric: tabular-nums; }
</style>
