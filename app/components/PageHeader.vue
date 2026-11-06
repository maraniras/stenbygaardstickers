<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  backTo?: string
  backLabel?: string
  compact?: boolean
}>()
const router = useRouter()
function back() {
  if (window.history.state?.back) router.back()
  else if (props.backTo) void router.push(props.backTo)
}
</script>

<template>
  <div
    class="page-heading"
    :class="{ compact }"
  >
    <header class="heading-row">
      <button
        v-if="backTo"
        class="heading-back page-icon-button"
        type="button"
        :aria-label="backLabel || 'Tilbage'"
        @click="back"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m14 6-6 6 6 6" />
        </svg>
      </button>
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
