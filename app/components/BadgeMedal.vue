<script setup lang="ts">
// Én badge som medalje: farvet ring efter niveau, emoji i midten, prikker for trin.
// Ikke opnåede er grå med fremskridt ("3/5").
const props = defineProps<{ badge: Badge }>()

const ring = computed(() => {
  const b = props.badge
  if (!b.earned) return '#d8d8de'
  if (b.kind === 'record') return 'conic-gradient(from 200deg, #ff5f6d, #ffc371, #ff5f6d)'
  if (b.kind === 'single') return TIER_COLORS[2]!
  return TIER_COLORS[Math.min(b.level, TIER_COLORS.length) - 1]!
})

const sub = computed(() => {
  const b = props.badge
  if (b.kind === 'record') return b.earned ? (b.final ? 'Vundet' : 'Rekord') : b.desc
  if (b.kind === 'tier') {
    if (!b.earned) return `${b.value}/${b.next} · ${b.desc}`
    return b.next ? `Næste: ${b.nextName} · ${b.value}/${b.next}` : 'Højeste niveau'
  }
  return b.earned ? (b.id === 'pioneer' && b.value > 1 ? `${b.value} lande` : 'Opnået') : b.desc
})
</script>

<template>
  <div class="badge" :class="[badge.kind, { earned: badge.earned }]" :title="`${badge.name}: ${badge.desc}`">
    <div class="medal" :style="{ background: ring }">
      <span class="face"><CountryFlag v-if="badge.flag" :code="badge.flag" /><template v-else>{{ badge.emoji }}</template></span>
      <span v-if="badge.kind === 'tier'" class="pips">
        <i v-for="i in badge.levels" :key="i" :class="{ on: i <= badge.level }" />
      </span>
    </div>
    <b>{{ badge.name }}</b>
    <span class="sub">{{ sub }}</span>
  </div>
</template>

<style scoped>
.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
  min-width: 0;
}
.medal {
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 6px;
  padding: 5px;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
}
.face {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, .12);
  font-size: 28px;
  line-height: 1;
}
.badge:not(.earned) .face { filter: grayscale(1); opacity: .45; }
.earned .medal { box-shadow: 0 4px 12px rgba(0, 0, 0, .14); }
.pips {
  position: absolute;
  bottom: -5px;
  display: flex;
  gap: 3px;
  padding: 2px 4px;
  border-radius: 999px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.pips i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--surface-2);
}
.pips i.on { background: var(--ink); }
b {
  font-size: 13px;
  line-height: 1.2;
  overflow-wrap: break-word;
  hyphens: manual;
}
.badge:not(.earned) b { color: var(--muted); }
.sub {
  font-size: 11px;
  line-height: 1.25;
  color: var(--muted);
}
</style>
