<script setup lang="ts">
import { crosswordCountdown } from '../../utils/crosswordCountdown'
useHead({ title: 'Øvrige spil · Stenbygaard Stickers' })
const { season } = useChristmasGames()
const { state } = useEconomy()
const { view, now } = useCrossword()
const { view: marvelView } = useCrossword(false, 'marvel')
const { view: secondView } = useCrossword(false, '2')
const secondCountdown = computed(() =>
  crosswordCountdown(secondView.value?.open ? null : secondView.value?.opensAt, now.value),
)
const secondOpening = computed(() =>
  secondView.value?.opensAt
    ? new Date(secondView.value.opensAt).toLocaleString('da-DK', {
        timeZone: 'Europe/Copenhagen',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '',
)
const countdown = computed(() =>
  crosswordCountdown(view.value?.open ? null : view.value?.opensAt, now.value),
)
const marvelCountdown = computed(() =>
  crosswordCountdown(marvelView.value?.open ? null : marvelView.value?.opensAt, now.value),
)
const marvelOpening = computed(() =>
  marvelView.value?.opensAt
    ? new Date(marvelView.value.opensAt).toLocaleString('da-DK', {
        timeZone: 'Europe/Copenhagen',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '',
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
      ><template #actions
        ><BananaBalance
          v-if="state"
          :balance="state.wallet.balance" /></template
    ></PageHeader>
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
          <h2>På Tværs #1</h2>
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
        <span v-if="view?.winner">Vundet af {{ view.winner.name }}</span>
        <CrosswordPrize v-else />
        <strong>{{
          view?.open ? 'Åbn krydsord →' : opening ? 'Åbner ' + opening : 'Tidspunkt følger'
        }}</strong>
      </div>
    </component>
    <component
      :is="marvelView?.open ? cardLink : 'div'"
      class="crossword-card marvel-card"
      :to="marvelView?.open ? '/spil/krydsord?id=marvel' : undefined"
      :aria-disabled="!marvelView?.open || undefined"
    >
      <span
        v-if="!marvelView?.open"
        class="coming-soon-ribbon"
        >Kommer snart</span
      >
      <div class="card-top">
        <span>ORDSPIL</span
        ><span
          v-if="marvelView?.open"
          class="preview"
          >Åbent</span
        >
      </div>
      <div class="card-body">
        <div>
          <h2>På Tværs: Doomsday Special</h2>
          <p>Helte, skurke og referencer. Hvem løser Marvel-krydsordet først?</p>
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
        v-if="marvelCountdown"
        class="countdown"
        role="timer"
        aria-label="Tid til krydsordet åbner, i timer, minutter og sekunder"
      >
        <span>Åbner om</span><strong>{{ marvelCountdown }}</strong>
      </div>
      <div class="card-bottom">
        <span v-if="marvelView?.winner">Vundet af {{ marvelView.winner.name }}</span>
        <CrosswordPrize
          v-else
          puzzle-id="marvel"
        />
        <strong>{{
          marvelView?.open
            ? 'Åbn krydsord →'
            : marvelOpening
              ? 'Åbner ' + marvelOpening
              : 'Tidspunkt følger'
        }}</strong>
      </div>
    </component>
    <component
      :is="secondView?.open ? cardLink : 'div'"
      class="crossword-card second-card"
      :to="secondView?.open ? '/spil/krydsord?id=2' : undefined"
      :aria-disabled="!secondView?.open || undefined"
    >
      <div class="card-top">
        <span>ORDSPIL</span
        ><span
          v-if="secondView?.open"
          class="preview"
          >Åbent</span
        >
      </div>
      <h2>På Tværs #2</h2>
      <div
        v-if="!secondView?.open"
        class="second-teaser"
      >
        <strong class="second-banner second-soon">KOMMER SNART</strong>
        <strong class="second-banner second-champion">KAN ANNA VINDE IGEN?</strong>
        <strong class="second-banner second-more">OVER 50% FLERE ORD</strong>
      </div>
      <p v-else>Flere ord. Flere krydsninger. Flere referencer.</p>
      <div
        v-if="secondCountdown"
        class="countdown"
        role="timer"
        aria-label="Tid til På Tværs #2 åbner"
      >
        <span>Åbner om</span><strong>{{ secondCountdown }}</strong>
      </div>
      <div class="card-bottom">
        <span v-if="secondView?.winner">Vundet af {{ secondView.winner.name }}</span>
        <CrosswordPrize
          v-else
          puzzle-id="2"
        />
        <strong>{{
          secondView?.open
            ? 'Åbn krydsord →'
            : secondOpening
              ? 'Åbner ' + secondOpening
              : 'Tidspunkt følger'
        }}</strong>
      </div>
    </component>
  </div>
</template>

<style scoped>
.second-card {
  margin-top: 18px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 18%, var(--surface)),
    var(--surface)
  );
}
.second-card h2 {
  margin-top: 16px;
}
.second-teaser {
  display: grid;
  gap: 10px;
  margin: 22px 0;
  text-align: center;
}
.second-banner {
  display: block;
  padding: 16px 12px;
  border: 1px solid var(--hairline);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  color: var(--text);
  font-size: clamp(15px, 4.5vw, 20px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.025em;
}
.second-soon {
  background: linear-gradient(135deg, var(--accent-light), var(--accent));
  color: var(--on-accent);
  font-size: clamp(21px, 6vw, 28px);
}
.second-champion {
  background: linear-gradient(135deg, var(--surface), var(--surface-2));
}
.second-more {
  background: linear-gradient(135deg, var(--accent-soft), var(--surface));
}
.second-card .card-bottom {
  flex-wrap: wrap;
}
.second-card .countdown {
  margin-top: 20px;
}
.second-card > p {
  margin-bottom: 22px;
}
.marvel-card {
  position: relative;
  overflow: hidden;
  margin-top: 18px;
}
.coming-soon-ribbon {
  position: absolute;
  z-index: 1;
  top: 30px;
  right: -46px;
  width: 190px;
  padding: 7px 0;
  transform: rotate(35deg);
  background: var(--accent);
  color: var(--on-accent);
  box-shadow: 0 3px 10px #0002;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-align: center;
  pointer-events: none;
}
.marvel-card .mini-crossword::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/games/crossword/marvel/marvel.svg') center / 94% auto no-repeat;
  opacity: 0.48;
  transform: rotate(-5deg);
  pointer-events: none;
}
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
  position: relative;
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
