<script setup lang="ts">
// Detaljer om én badge: navn, beskrivelse, hvornår og med hvilken sticker den blev
// opnået, alle trin for trin-badges, fremskridt for dem man mangler, og hvem der
// har rekorden lige nu.
const props = defineProps<{ badge: Badge, person: string }>()
const emit = defineEmits<{ close: [] }>()

const b = computed(() => props.badge)
const pct = (value: number, target: number) => `${Math.min(100, Math.round(value / target * 100))}%`

const status = computed(() => {
  const x = b.value
  if (x.kind === 'record') {
    if (x.earned) return x.final ? 'Vundet' : 'Har rekorden lige nu'
    return x.final ? 'Ikke vundet' : 'Har ikke rekorden'
  }
  if (x.kind === 'tier' && x.earned) return x.next ? `Niveau ${x.level} af ${x.levels}` : 'Højeste niveau nået 🎉'
  return x.earned ? 'Opnået' : 'Ikke opnået endnu'
})

/** Point-tekst øverst: hvad man har fået, eller hvad den giver */
const pointsText = computed(() => {
  const x = b.value
  if (x.kind === 'record') {
    if (!x.id.startsWith('year-')) return 'Ingen point – rekorder kan mistes'
    if (x.earned && x.final) return `+${x.points} point`
    return `${x.worth} point, når året er slut`
  }
  if (x.id === 'pioneer') return x.earned ? `+${x.points} point · ${x.worth} pr. land` : `${x.worth} point pr. land`
  if (x.kind === 'tier') return x.earned ? `+${x.points} point${x.next ? ` · næste trin giver ${x.worth}` : ''}` : `Første trin giver ${x.worth} point`
  return x.earned ? `+${x.points} point` : `Giver ${x.worth} point`
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="sheet" role="dialog" aria-modal="true" :aria-label="b.name">
      <button class="x" aria-label="Luk" @click="emit('close')">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>

      <div class="top">
        <div class="medal-wrap"><BadgeMedal :badge="b" big /></div>
        <span class="status" :class="{ earned: b.earned }">{{ status }}</span>
        <h2>{{ b.name }}</h2>
        <p class="desc">{{ b.about ?? b.desc }}</p>
        <span class="pts" :class="{ got: b.points > 0 }">{{ pointsText }}</span>
      </div>

      <!-- Hvornår -->
      <div v-if="b.earned && b.earnedAt && b.kind !== 'tier'" class="box when">
        <span class="eyebrow">{{ b.kind === 'record' && !b.final ? 'Har haft rekorden siden' : 'Opnået' }}</span>
        <b>{{ formatDate(b.earnedAt) }}</b>
        <NuxtLink v-if="b.earnedWith" class="with" :to="`/sticker/${b.earnedWith.id}`" @click="emit('close')">
          med {{ b.earnedWith.title }} ›
        </NuxtLink>
      </div>

      <!-- Trin -->
      <div v-if="b.steps" class="box">
        <div v-if="b.next" class="progress-head">
          <span>Næste: <b>{{ b.nextName }}</b></span>
          <span class="num">{{ b.value }} / {{ b.next }}</span>
        </div>
        <div v-if="b.next" class="bar"><span :style="{ width: pct(b.value, b.next) }" /></div>
        <ol class="steps">
          <li v-for="(s, i) in b.steps" :key="s.at" :class="{ done: b.level > i }">
            <span class="dot" :style="{ background: b.level > i ? TIER_COLORS[i] : undefined }">{{ b.level > i ? '✓' : i + 1 }}</span>
            <span class="step-name">
              <b>{{ s.name }}</b>
              <span>{{ s.label }}</span>
            </span>
            <span class="step-date">
              <b>{{ s.points }} p</b>
              <span v-if="s.reachedAt">{{ formatDate(s.reachedAt) }}</span>
            </span>
          </li>
        </ol>
      </div>

      <!-- Fremskridt for enkelt-badges -->
      <div v-else-if="!b.earned && b.progress" class="box">
        <div class="progress-head">
          <span>Fremskridt</span>
          <span class="num">{{ Math.min(b.progress.value, b.progress.target) }} / {{ b.progress.target }}</span>
        </div>
        <div class="bar"><span :style="{ width: pct(b.progress.value, b.progress.target) }" /></div>
      </div>

      <!-- Rekordholder -->
      <div v-if="b.kind === 'record' && !b.earned" class="box">
        <span class="eyebrow">{{ b.final ? 'Vinder' : 'Har rekorden lige nu' }}</span>
        <div v-if="b.holders?.length" class="holders">
          <NuxtLink v-for="h in b.holders" :key="h" class="chip holder" :to="personUrl(h)" @click="emit('close')">
            <span class="avatar">{{ h[0] }}</span>{{ h }}
          </NuxtLink>
        </div>
        <p v-else class="muted">Ingen endnu</p>
      </div>
      <p v-if="b.kind === 'record' && !b.final" class="note">Rekorder kan mistes, hvis nogen slår dem.</p>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(10, 10, 14, .45);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}
.sheet {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  overflow-y: auto;
  padding: 24px 18px calc(24px + var(--safe-b));
  border-radius: 28px 28px 0 0;
  background: var(--bg);
  box-shadow: var(--shadow);
}
@media (min-width: 600px) {
  .backdrop { align-items: center; }
  .sheet { border-radius: 28px; }
}
.x {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface-2);
  cursor: pointer;
}
.x svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }
.top {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.medal-wrap { pointer-events: none; }
.status {
  margin-top: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.status.earned { background: #e3f5e8; color: #1b6e34; }
h2 { margin-top: 10px; font-size: 24px; }
.desc { margin: 6px 0 0; color: var(--muted); }
.pts {
  margin-top: 10px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
}
.pts.got { background: var(--accent); color: var(--on-accent); }
.box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.when b { font-size: 18px; }
.with { font-weight: 700; color: var(--text); text-decoration: none; }
.progress-head { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; }
.num { font-weight: 800; font-variant-numeric: tabular-nums; }
.bar {
  height: 8px;
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
.steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}
.steps li { display: flex; align-items: center; gap: 10px; }
.dot {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}
.done .dot { color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, .3); }
.step-name { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.step-name b { font-size: 15px; }
.step-name span { font-size: 12px; color: var(--muted); }
.steps li:not(.done) .step-name b { color: var(--muted); }
.step-date { display: flex; flex-direction: column; align-items: flex-end; font-size: 12px; color: var(--muted); white-space: nowrap; }
.step-date b { color: var(--text); font-size: 13px; }
.steps li:not(.done) .step-date b { color: var(--muted); }
.holders { display: flex; flex-wrap: wrap; gap: 6px; }
.holder { padding: 3px 10px 3px 3px; font-size: 14px; }
.avatar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 12px;
  font-weight: 800;
}
.muted { margin: 0; color: var(--muted); }
.note { margin: 12px 0 0; font-size: 12px; color: var(--muted); text-align: center; }
</style>
