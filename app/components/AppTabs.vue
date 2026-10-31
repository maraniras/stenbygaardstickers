<script setup lang="ts">
const model = defineModel<string>({ required: true })
const props = defineProps<{
  id: string
  label: string
  options: { value: string; label: string }[]
}>()
function move(event: KeyboardEvent, index: number) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  const count = props.options.length
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? count - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count
  model.value = props.options[next]!.value
  nextTick(() => document.getElementById(`${props.id}-tab-${model.value}`)?.focus())
}
</script>

<template>
  <div
    class="app-tabs"
    role="tablist"
    :aria-label="label"
  >
    <button
      v-for="(option, index) in options"
      :id="`${id}-tab-${option.value}`"
      :key="option.value"
      type="button"
      role="tab"
      :aria-selected="model === option.value"
      :aria-controls="`${id}-panel-${option.value}`"
      :tabindex="model === option.value ? 0 : -1"
      @click="model = option.value"
      @keydown="move($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.app-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 16px 0;
  border-radius: 16px;
  background: var(--surface-2);
}
button {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
button[aria-selected='true'] {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
button:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
</style>
