<script setup lang="ts">
const { appearance, setAppearance } = useAppearance()
const options: { value: Appearance, label: string }[] = [
  { value: 'system', label: 'Følg enheden' },
  { value: 'light', label: 'Lys' },
  { value: 'dark', label: 'Mørk' },
]
</script>

<template>
  <section class="appearance-settings" aria-labelledby="appearance-title">
    <h2 id="appearance-title">Udseende</h2>
    <div class="choices" role="group" aria-label="Farvetema">
      <button v-for="option in options" :key="option.value" type="button"
        :aria-pressed="appearance === option.value" @click="setAppearance(option.value)">
        {{ option.label }}
      </button>
    </div>
    <p>Gemmes på denne enhed. Vejkortet følger temaet; luftfoto beholder sine farver.</p>
  </section>
</template>

<style scoped>
.appearance-settings { padding: 18px; border-radius: var(--radius); background: var(--surface); box-shadow: var(--shadow-sm); }
h2 { margin-bottom: 12px; font-size: 18px; }
.choices { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--surface-2); }
button { flex: 1; min-height: 44px; padding: 8px 6px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); font-size: 13px; font-weight: 700; cursor: pointer; }
button[aria-pressed="true"] { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
p { margin: 10px 0 0; font-size: 13px; color: var(--muted); }
</style>
