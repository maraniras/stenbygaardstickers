<script setup lang="ts">
// Level 1–10 på profilen: level-badge, titel, point og en bjælke mod næste level.
// Tryk for at se alle levels med deres badges.
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
    <LevelBadge :level="lv.level" :size="68" />
    <span class="info">
      <span class="eyebrow">Level {{ lv.level }}</span>
      <b>{{ lv.title }}</b>
      <span class="bar"><span :style="{ width: `${pct}%` }" /></span>
      <span v-if="lv.next" class="to-next">{{ lv.points }} point · {{ lv.next.at - lv.points }} til {{ lv.next.title }}</span>
      <span v-else class="to-next">{{ lv.points }} point · højeste level 🎉</span>
    </span>
    <svg class="chev" :class="{ open }" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
  </button>

  <ol v-if="open" class="levels">
    <li v-for="(l, i) in LEVELS" :key="l.at" :class="{ done: lv.level > i, current: lv.level === i + 1 }">
      <LevelBadge :level="i + 1" :size="30" class="lb" />
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
.info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.info b { font-size: 19px; line-height: 1.2; }
.bar {
  height: 7px;
  margin: 6px 0 2px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}
.to-next { font-size: 13px; font-weight: 600; color: var(--muted); }
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
  gap: 12px;
  padding: 6px 8px;
  border-radius: 12px;
  color: var(--muted);
}
.levels li:not(.done) .lb { filter: grayscale(1); opacity: .45; }
.levels li.done { color: var(--text); }
.levels li.current { background: var(--accent-soft); font-weight: 700; }
.t { flex: 1; }
.p { font-size: 13px; font-variant-numeric: tabular-nums; }
</style>
