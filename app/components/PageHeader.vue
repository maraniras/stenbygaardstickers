<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  backTo?: string
  backLabel?: string
  compact?: boolean
}>()
const router = useRouter()
const destination = computed(() => {
  if (props.backLabel)
    return props.backLabel
      .replace(/^Tilbage til /i, '')
      .replace(/^./, (c) => c.toLocaleUpperCase('da'))
  const path = props.backTo?.split('?')[0] ?? ''
  if (path.startsWith('/person/')) return 'Profil'
  if (path.startsWith('/admin')) return 'Admin'
  return (
    (
      {
        '/': 'Udforsk',
        '/liste': 'Udforsk',
        '/spil': 'Daglige spil',
        '/spil/casino': 'Casino',
        '/spil/jul': 'Julespil',
        '/spil/oevrige': 'Øvrige spil',
        '/mig': 'Indstillinger',
        '/rangliste': 'Brugere',
      } as Record<string, string>
    )[path] ?? 'Tilbage'
  )
})
function back() {
  const previous = window.history.state?.back
  if (
    typeof previous === 'string' &&
    props.backTo &&
    router.resolve(previous).path === router.resolve(props.backTo).path
  )
    router.back()
  else if (props.backTo) void router.push(props.backTo)
}
</script>

<template>
  <div
    class="page-heading"
    :class="{ compact }"
  >
    <button
      v-if="backTo"
      class="back-link"
      type="button"
      :aria-label="`Tilbage til ${destination}`"
      @click="back"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="m14 6-6 6 6 6" /></svg
      >{{ destination }}
    </button>
    <header class="heading-row">
      <slot name="leading" />
      <h1 class="heading-title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <div
        v-if="$slots.actions"
        class="heading-actions"
      >
        <slot name="actions" />
      </div>
    </header>
    <p
      v-if="description || $slots.description"
      class="heading-description"
    >
      <slot name="description">{{ description }}</slot>
    </p>
    <slot />
  </div>
</template>

<style scoped>
.page-heading {
  flex: none;
  margin-bottom: 20px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  margin: -6px 0 6px -6px;
  padding: 0 6px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.back-link svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.back-link:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
.compact .back-link {
  min-height: 28px;
  margin-bottom: 2px;
}
.heading-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}
.heading-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 32px;
  line-height: 1.2;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.heading-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.heading-description {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}
.compact {
  margin-bottom: 10px;
}
.compact .heading-row {
  gap: 8px;
}
.compact .heading-title {
  font-size: clamp(16px, 4.5vw, 21px);
}
@media (max-width: 350px) {
  .heading-title {
    font-size: 28px;
  }
}
</style>
