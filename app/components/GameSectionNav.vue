<script setup lang="ts">
defineProps<{
  section: 'daily' | 'casino' | 'christmas' | 'other'
  christmasVisible: boolean
}>()
const { dailyReadyCount, christmasReadyCount } = useDailyAvailability()
</script>

<template>
  <nav
    class="game-sections"
    :class="{ 'has-christmas': christmasVisible }"
    aria-label="Spilområder"
  >
    <NuxtLink
      to="/spil"
      :class="{ active: section === 'daily' }"
      :aria-current="section === 'daily' ? 'page' : undefined"
    >
      Daglige spil
      <span
        v-if="dailyReadyCount"
        class="ready"
        :aria-label="`${dailyReadyCount} spil klar`"
        >{{ dailyReadyCount }}</span
      >
    </NuxtLink>
    <NuxtLink
      to="/spil/casino"
      :class="{ active: section === 'casino' }"
      :aria-current="section === 'casino' ? 'page' : undefined"
      >Casino</NuxtLink
    >
    <NuxtLink
      v-if="christmasVisible"
      to="/spil/jul"
      class="christmas-tab"
      :class="{ active: section === 'christmas' }"
      :aria-current="section === 'christmas' ? 'page' : undefined"
      ><svg
        class="christmas-trim"
        viewBox="0 0 120 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 4Q60 22 116 4"
          stroke="#547451"
          stroke-width="1.5"
        />
        <g
          stroke="#34815c"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M0 3 31 12M5 0 9 5 2 8M12 1 16 7 8 11M20 4 23 9 16 14M27 7 30 12 24 16" />
          <path d="m120 3-31 9M115 0l-4 5 7 3M108 1l-4 6 8 4M100 4l-3 5 7 5M93 7l-3 5 6 4" />
        </g>
        <g class="christmas-bulbs">
          <ellipse
            cx="23"
            cy="13"
            rx="2.5"
            ry="3.5"
            fill="#ffd77c"
          />
          <ellipse
            cx="42"
            cy="17"
            rx="2.5"
            ry="3.5"
            fill="#ed8e81"
          />
          <ellipse
            cx="60"
            cy="18"
            rx="2.5"
            ry="3.5"
            fill="#ffe5a0"
          />
          <ellipse
            cx="78"
            cy="17"
            rx="2.5"
            ry="3.5"
            fill="#ed8e81"
          />
          <ellipse
            cx="97"
            cy="13"
            rx="2.5"
            ry="3.5"
            fill="#ffd77c"
          />
        </g>
      </svg>
      Julespil
      <span
        v-if="christmasReadyCount"
        class="ready"
        :aria-label="`${christmasReadyCount} spil klar`"
        >{{ christmasReadyCount }}</span
      ></NuxtLink
    >
    <NuxtLink
      to="/spil/oevrige"
      :class="{ active: section === 'other' }"
      :aria-current="section === 'other' ? 'page' : undefined"
      >Øvrige</NuxtLink
    >
  </nav>
</template>

<style scoped>
.game-sections {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin: 20px 0;
  padding: 5px;
  border: 1px solid var(--hairline);
  border-radius: 17px;
  background: var(--surface-2);
}
.has-christmas {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.has-christmas a {
  font-size: 12px;
  flex-wrap: wrap;
  padding: 8px 4px;
  gap: 4px;
}
a {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--muted);
  font-size: 13px;
  font-weight: 750;
}
@media (max-width: 430px) {
  .has-christmas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
a.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.has-christmas .christmas-tab {
  position: relative;
  isolation: isolate;
  padding-top: 17px;
  background: linear-gradient(145deg, #34815c18, #e9b95f14);
  color: var(--text);
  box-shadow: inset 0 0 0 1px #bfa16838;
}
.has-christmas .christmas-tab.active {
  background: linear-gradient(145deg, #34815c28, #e9b95f1c), var(--surface);
  box-shadow:
    inset 0 0 0 1px #bf9b6266,
    var(--shadow-sm);
}
.christmas-trim {
  position: absolute;
  pointer-events: none;
  top: -3px;
  left: 0;
  width: 100%;
  height: 21px;
  overflow: visible;
}
.christmas-bulbs {
  filter: drop-shadow(0 0 2px #fbc66f99);
}
.ready {
  display: grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--text);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
</style>
