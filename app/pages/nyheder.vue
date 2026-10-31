<script setup lang="ts">
// Hvad er nyt – versioner og korte noter (app/utils/changelog.ts)
const router = useRouter()
useHead({ title: 'Hvad er nyt · Stenbygaard Stickers' })

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/liste')
}
</script>

<template>
  <div class="page">
    <button
      class="back"
      aria-label="Tilbage"
      @click="back"
    >
      <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
    </button>
    <h1>Hvad er nyt</h1>

    <section
      v-for="r in CHANGELOG"
      :key="r.version"
      class="release"
    >
      <div class="head">
        <b>Version {{ r.version }}</b>
        <span
          v-if="r.date"
          class="date"
          >{{ formatDate(r.date) }}</span
        >
        <span
          v-else
          class="new"
          >Ny</span
        >
      </div>
      <ul>
        <li
          v-for="n in r.notes"
          :key="n"
        >
          {{ n }}
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
.back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.back svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
h1 {
  margin: 14px 0 18px;
  font-size: 34px;
}
.release {
  margin-bottom: 12px;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.head b {
  font-size: 17px;
}
.date {
  font-size: 13px;
  color: var(--muted);
}
.new {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 12px;
  font-weight: 800;
}
ul {
  margin: 10px 0 0;
  padding-left: 20px;
}
li {
  margin: 4px 0;
  line-height: 1.45;
}
</style>
