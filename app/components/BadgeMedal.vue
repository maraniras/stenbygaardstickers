<script setup lang="ts">
// Én badge som medalje: farvet ring efter niveau, ikon (SVG, ellers emoji) i midten,
// prikker for trin. Ikke opnåede er grå med fremskridt ("3/5").
const props = defineProps<{ badge: Badge, big?: boolean }>()
const icon = computed(() => badgeIcon(props.badge.id))
// Mangler billedet (fx en ny badge uden ikon endnu), vises emojien
const broken = ref(false)
watch(icon, () => { broken.value = false })

const ring = computed(() => {
  const b = props.badge
  if (!b.earned) return '#d8d8de'
  if (b.kind === 'record') return 'conic-gradient(from 200deg, #ff5f6d, #ffc371, #ff5f6d)'
  if (b.kind === 'single') return TIER_COLORS[2]!
  return TIER_COLORS[Math.min(b.level, TIER_COLORS.length) - 1]!
})

// Kort tekst under medaljen – beskrivelsen står kun i modalen
const sub = computed(() => {
  const b = props.badge
  if (b.kind === 'record') {
    if (b.earned) return b.final ? `Vundet · ${b.points} p` : 'Rekord'
    return 'Rekord'
  }
  if (b.kind === 'tier') {
    if (!b.earned) return `${b.value}/${b.next} · ${b.worth} p`
    return b.next ? `${b.value}/${b.next} · ${b.points} p` : `Max · ${b.points} p`
  }
  if (b.earned) return b.id === 'pioneer' && (b.count ?? 0) > 1 ? `${b.count} lande · ${b.points} p` : `${b.points} p`
  return b.progress ? `${Math.min(b.progress.value, b.progress.target)}/${b.progress.target} · ${b.worth} p` : `${b.worth} p`
})
</script>

<template>
  <div class="badge" :class="[badge.kind, { earned: badge.earned, big }]" :title="`${badge.name}: ${badge.desc}`">
    <div class="medal" :style="{ background: ring }">
      <span class="face">
        <CountryFlag v-if="badge.flag" :code="badge.flag" />
        <img v-else-if="icon && !broken" class="icon" :class="{ custom: icon.includes('/custom/') }" :src="icon" alt="" draggable="false" @error="broken = true">
        <template v-else>{{ badge.emoji }}</template>
      </span>
      <span v-if="badge.kind === 'tier'" class="pips">
        <i v-for="i in badge.levels" :key="i" :class="{ on: i <= badge.level }" />
      </span>
    </div>
    <b v-if="!big">{{ badge.name }}</b>
    <span v-if="!big" class="sub">{{ sub }}</span>
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
.icon {
  width: 62%;
  height: 62%;
  object-fit: contain;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .18));
  user-select: none;
}
.badge:not(.earned) .face { filter: grayscale(1); opacity: .45; }
.icon.custom { width:80%; height:80%; }
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
<style scoped>
.big .medal { width: 104px; height: 104px; padding: 7px; }
.big .face { font-size: 48px; }
.big .pips i { width: 7px; height: 7px; }
</style>
