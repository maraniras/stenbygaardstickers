<script setup lang="ts">
// Billede i stedet for emoji, da Windows ikke viser flag-emojis
const props = defineProps<{ code: string }>()
const cc = computed(() => (/^[a-z]{2}$/i.test(props.code) ? props.code.toLowerCase() : ''))
</script>

<template>
  <img v-if="cc" class="flag" :src="`https://flagcdn.com/${cc}.svg`" alt="" width="20" height="15">
</template>

<style scoped>
.flag {
  display: inline-block;
  width: 1.2em;
  height: .9em;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .15);
  vertical-align: -0.08em;
}
</style>
