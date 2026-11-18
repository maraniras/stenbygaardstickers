<script setup lang="ts">
import { DANISH_KEY_ROWS } from '../../shared/utils/danish-keyboard'
import type { WordleMark } from '../../shared/types/wordle'
defineProps<{ marks: Partial<Record<string, WordleMark>>; disabled: boolean }>()
const emit = defineEmits<{ press: [key: string] }>()
const rows = [
  [...DANISH_KEY_ROWS[0]],
  [...DANISH_KEY_ROWS[1]],
  ['Enter', ...DANISH_KEY_ROWS[2], 'Backspace'],
]
</script>
<template>
  <div
    class="wordle-keyboard"
    role="group"
    aria-label="Dansk bogstavtastatur"
  >
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="key-row"
    >
      <button
        v-for="key in row"
        :key="key"
        type="button"
        :class="[marks[key], { wide: key.length > 1 }]"
        :disabled="disabled"
        :aria-label="
          key === 'Enter'
            ? 'Gæt ord'
            : key === 'Backspace'
              ? 'Slet bogstav'
              : `${key}${marks[key] === 'correct' ? ', korrekt plads' : marks[key] === 'present' ? ', findes i ordet' : marks[key] === 'absent' ? ', findes ikke i ordet' : ''}`
        "
        @click="emit('press', key)"
      >
        {{ key === 'Enter' ? 'GÆT' : key === 'Backspace' ? '⌫' : key }}
      </button>
    </div>
  </div>
</template>
<style scoped>
.wordle-keyboard {
  display: grid;
  gap: 5px;
  flex: none;
}
.key-row {
  display: flex;
  gap: 4px;
}
button {
  flex: 1;
  min-width: 0;
  height: clamp(34px, 5.6dvh, 48px);
  padding: 0;
  border: 1px solid var(--hairline);
  border-radius: 7px;
  color: var(--text);
  background: var(--surface-2);
  box-shadow: var(--shadow-sm);
  font-size: clamp(11px, 3.3vw, 15px);
  font-weight: 750;
  touch-action: manipulation;
}
button.wide {
  flex: 1.8;
  font-size: 12px;
}
button.correct {
  background: var(--wordle-correct, #387b57);
  color: white;
}
button.present {
  background: var(--wordle-present, #a27924);
  color: white;
}
button.absent {
  background: #646975;
  color: white;
}
</style>
