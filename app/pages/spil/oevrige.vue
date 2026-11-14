<script setup lang="ts">
import { crosswordCountdown } from '../../utils/crosswordCountdown'
useHead({ title: 'Øvrige spil · Stenbygaard Stickers' })
const { season } = useChristmasGames()
const { view, now } = useCrossword()
const countdown = computed(() =>
  crosswordCountdown(view.value?.open ? null : view.value?.opensAt, now.value),
)
const cardLink = resolveComponent('NuxtLink')
const opening = computed(() =>
  view.value?.opensAt
    ? new Date(view.value.opensAt).toLocaleString('da-DK', {
        timeZone: 'Europe/Copenhagen',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '',
)
</script>

<template>
  <div class="other-games">
    <PageHeader
      title="Spil"
      description="En lille pause i dit eget tempo."
    />
    <GameSectionNav
      section="other"
      :christmas-visible="season.visible"
    />
    <component
      :is="view?.open ? cardLink : 'div'"
      class="crossword-card"
      :to="view?.open ? '/spil/krydsord' : undefined"
      :aria-disabled="!view?.open || undefined"
    >
      <div class="card-top">
        <span>ORDSPIL</span><span class="preview">{{ view?.open ? 'Åbent' : 'Kommer snart' }}</span>
      </div>
      <div class="card-body">
        <div>
          <h2>Kryds &amp; tværs #1</h2>
          <p>Ét ord ad gangen. Hvem løser hele krydsordet først?</p>
        </div>
        <div
          class="mini-crossword"
          aria-hidden="true"
        >
          <span
            v-for="i in 25"
            :key="i"
            :class="{ empty: [2, 5, 7, 13, 16, 19, 22].includes(i) }"
          />
        </div>
      </div>
      <div
        v-if="countdown"
        class="countdown"
        role="timer"
        aria-label="Tid til krydsordet åbner, i timer, minutter og sekunder"
      >
        <span>Åbner om</span><strong>{{ countdown }}</strong>
      </div>
      <div class="card-bottom">
        <span>{{
          view?.winner
            ? 'Vundet af ' + view.winner.name
            : '500 bananer + vinderbadge til den første'
        }}</span
        ><strong>{{
          view?.open ? 'Åbn krydsord →' : opening ? 'Åbner ' + opening : 'Tidspunkt følger'
        }}</strong>
      </div>
    </component>
  </div>
</template>

<style scoped>
.other-games {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 20px;
}
.crossword-card {
  display: block;
  padding: 22px;
  border: 1px solid var(--hairline);
  border-radius: 24px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--accent) 9%, var(--surface)),
    var(--surface)
  );
  box-shadow: var(--shadow-sm);
  text-decoration: none;
}
.card-top,
.card-bottom,
.card-body {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}
.card-top {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.preview {
  padding: 4px 9px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  letter-spacing: 0;
}
.card-body {
  margin: 22px 0;
}
h2 {
  font-size: 25px;
}
p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 10px 0 0;
}
.mini-crossword {
  flex: none;
  display: grid;
  grid-template-columns: repeat(5, 18px);
  gap: 2px;
  transform: rotate(5deg);
}
.mini-crossword span {
  display: grid;
  place-items: center;
  height: 18px;
  border: 1px solid var(--hairline);
  background: var(--accent-soft);
  font-size: 10px;
  font-weight: 800;
}
.mini-crossword .empty {
  visibility: hidden;
}
.card-bottom {
  align-items: flex-end;
  font-size: 10px;
  color: var(--muted);
}
.countdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 18px;
  padding: 10px 13px;
  border-radius: 13px;
  background: var(--accent-soft);
  color: var(--text);
}
.countdown span {
  font-size: 12px;
  font-weight: 650;
}
.countdown strong {
  font-size: 23px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
}
.card-bottom strong {
  flex: none;
  font-size: 12px;
  color: var(--text);
}
.crossword-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
@media (max-width: 350px) {
  .crossword-card {
    padding: 18px;
  }
  .card-body {
    gap: 8px;
  }
  h2 {
    font-size: 22px;
  }
  .mini-crossword {
    grid-template-columns: repeat(5, 14px);
  }
  .mini-crossword span {
    height: 14px;
    font-size: 9px;
  }
}
</style>
