<script setup lang="ts">
const props = defineProps<{ at: string; compact?: boolean }>()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
const countdown = computed(() => {
  const s = Math.max(0, Math.ceil((Date.parse(props.at) - now.value) / 1000))
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
})
</script>
<template>
  <p
    class="reset"
    :class="{ compact }"
  >
    Nyt spil om <b>{{ countdown }}</b
    ><span>Kl. 04.00 dansk tid</span>
  </p>
</template>
<style scoped>
.reset {
  color: var(--muted);
  text-align: center;
  font-size: 12px;
}
.reset b {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.reset span {
  display: block;
  margin-top: 4px;
  font-size: 11px;
}
.reset.compact {
  margin: 0;
  font-size: 10px;
  text-align: left;
}
.reset.compact span {
  margin-top: 2px;
  font-size: 9px;
}
</style>
