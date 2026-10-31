<script setup lang="ts">
import type { JackStatsPublic } from '../../shared/types/jackStats'
defineProps<{ stats: JackStatsPublic }>()
</script>
<template>
  <details class="jack-stats">
    <summary>
      <img
        src="/badges/custom/jack-rounds.webp"
        alt=""
      /><span
        ><b>Bananjack</b
        ><small
          >{{ stats.rounds }} {{ stats.rounds === 1 ? 'runde' : 'runder' }} ·
          {{ stats.wins }} vundne hænder</small
        ></span
      ><svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="m7 10 5 5 5-5" />
      </svg>
    </summary>
    <dl>
      <div>
        <dt>Runder</dt>
        <dd>{{ stats.rounds.toLocaleString('da-DK') }}</dd>
      </div>
      <div>
        <dt>Vundne hænder</dt>
        <dd>{{ stats.wins.toLocaleString('da-DK') }}</dd>
      </div>
      <div>
        <dt>Naturlige Bananjacks</dt>
        <dd>{{ stats.naturals.toLocaleString('da-DK') }}</dd>
      </div>
      <div>
        <dt>Sejre efter fordobling</dt>
        <dd>{{ stats.doubleWins.toLocaleString('da-DK') }}</dd>
      </div>
      <div>
        <dt>Bedste Bananjack-stime</dt>
        <dd>{{ stats.bestNaturalStreak }}</dd>
      </div>
      <div>
        <dt>Netto fra spillet</dt>
        <dd>{{ stats.net > 0 ? '+' : '' }}{{ stats.net.toLocaleString('da-DK') }} 🍌</dd>
      </div>
    </dl>
    <p>
      Netto er gevinster minus indsatser, uden badgebonuser. Optællingen starter med denne
      opdatering og din senest gemte runde.
    </p>
  </details>
</template>
<style scoped>
.jack-stats {
  margin: 14px 0;
  border: 1px solid var(--hairline);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
summary {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  min-height: 68px;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary > img {
  width: 44px;
  height: 44px;
  object-fit: contain;
}
summary > span {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
summary b {
  font-size: 14px;
}
summary small {
  font-size: 11px;
  color: var(--muted);
}
summary svg {
  width: 20px;
  height: 20px;
  margin-left: auto;
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  transition: transform 0.2s;
}
details[open] summary svg {
  transform: rotate(180deg);
}
dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
  padding: 5px 16px 12px;
  margin: 0;
}
dt {
  font-size: 10px;
  color: var(--muted);
}
dd {
  font-size: 20px;
  font-weight: 750;
  margin: 4px 0 0;
  font-variant-numeric: tabular-nums;
}
.jack-stats > p {
  font-size: 10px;
  line-height: 1.6;
  color: var(--muted);
  padding: 0 16px 14px;
  margin: 0;
}
summary:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
  border-radius: 16px;
}
@media (prefers-reduced-motion: reduce) {
  summary svg {
    transition: none;
  }
}
</style>
