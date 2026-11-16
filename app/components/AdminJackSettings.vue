<script setup lang="ts">
import type { JackShuffleMode } from '../../shared/types/bananjack'

const mode = ref<JackShuffleMode>()
const busy = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    mode.value = (await $fetch('/api/admin/bananjack')).shuffleMode
  } catch {
    error.value = 'Kunne ikke hente Bananjack-indstillinger. Genindlæs siden.'
  }
})

async function toggle() {
  if (!mode.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch('/api/admin/bananjack', {
      method: 'PUT',
      body: { shuffleMode: mode.value === 'continuous' ? 'per-round' : 'continuous' },
    })
    mode.value = result.shuffleMode
  } catch {
    error.value = 'Kunne ikke gemme blandingsmetoden. Prøv igen.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="jack-settings">
    <h2 class="eyebrow">Bananjack · kortblanding</h2>
    <button
      class="chip"
      role="switch"
      :aria-checked="mode === 'continuous'"
      :disabled="!mode || busy"
      @click="toggle"
    >
      {{
        busy
          ? 'Gemmer…'
          : !mode
            ? 'Indlæser…'
            : mode === 'continuous'
              ? 'Gemt kortbunke: til'
              : 'Gemt kortbunke: fra'
      }}
    </button>
    <p class="hint-text">
      Til: seks kortspil pr. bruger, som fortsætter mellem runder og blandes igen, når mindst 75 %
      er brugt. Fra: ny blanding hver runde. Ændringer gælder fra næste hånd.
    </p>
    <p
      v-if="error"
      class="err"
      role="alert"
    >
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
.jack-settings {
  margin-top: 28px;
}
.jack-settings .chip {
  margin-block: 12px;
}
</style>
