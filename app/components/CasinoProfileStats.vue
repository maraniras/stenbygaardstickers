<script setup lang="ts">
defineProps<{
  title: string
  image: string
  summary: string
  rows: { label: string; value: number; bananas?: boolean }[]
  note: string
}>()
</script>
<template>
  <details class="casino-stats">
    <summary>
      <img
        :src="image"
        alt=""
      />
      <span
        ><b>{{ title }}</b
        ><small>{{ summary }}</small></span
      >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="m7 10 5 5 5-5" />
      </svg>
    </summary>
    <dl>
      <div
        v-for="row in rows"
        :key="row.label"
      >
        <dt>{{ row.label }}</dt>
        <dd
          :class="{
            positive: row.bananas && row.value > 0,
            negative: row.bananas && row.value < 0,
          }"
        >
          {{ row.bananas && row.value > 0 ? '+' : '' }}{{ row.value.toLocaleString('da-DK')
          }}{{ row.bananas ? ' 🍌' : '' }}
        </dd>
      </div>
    </dl>
    <p>{{ note }}</p>
  </details>
</template>
<style scoped>
.casino-stats {
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
  min-width: 0;
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
  overflow-wrap: anywhere;
}
.casino-stats > p {
  font-size: 10px;
  line-height: 1.6;
  color: var(--muted);
  padding: 0 16px 14px;
  margin: 0;
}
.positive {
  color: light-dark(#287343, #95d7ac);
}
.negative {
  color: light-dark(#b5404e, #f3a0a9);
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
