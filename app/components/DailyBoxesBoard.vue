<script setup lang="ts">
import type { BoxesRun } from '../../shared/types/boxes'
import { boxPrizeIcon, boxPrizeLabel } from '../../shared/utils/boxes'
const props = defineProps<{
  selected: number[]
  run: BoxesRun | null
  flipped: boolean
  resultVisible: boolean
  locked: boolean
  busy: boolean
}>()
const emit = defineEmits<{ toggle: [index: number] }>()
function prizeAt(index: number) {
  const position = props.run?.choices.indexOf(index) ?? -1
  return position >= 0 ? props.run?.prizes[position] : undefined
}
</script>
<template>
  <div
    class="boxes-grid"
    :aria-busy="busy"
    aria-label="Dagens 12 bokse"
  >
    <button
      v-for="index in 12"
      :key="index"
      type="button"
      :class="[
        'mystery-box',
        {
          selected: selected.includes(index - 1),
          opened: flipped && selected.includes(index - 1),
          dimmed: !!run && !selected.includes(index - 1),
        },
      ]"
      :aria-pressed="selected.includes(index - 1)"
      :aria-label="`Boks ${index}${resultVisible && prizeAt(index - 1) ? ` · ${boxPrizeLabel(prizeAt(index - 1)!)}` : selected.includes(index - 1) ? ' · valgt' : ''}`"
      :disabled="locked || (selected.length === 3 && !selected.includes(index - 1))"
      @click="emit('toggle', index - 1)"
    >
      <span
        class="box-flipper"
        aria-hidden="true"
      >
        <span class="box-front"
          ><small>{{ index }}</small
          ><span class="ribbon" /><span class="bow">∞</span><b>?</b
          ><i v-if="selected.includes(index - 1)">✓</i></span
        >
        <span
          class="box-back"
          :class="{
            elf: prizeAt(index - 1)?.kind === 'elf',
            miv: prizeAt(index - 1)?.kind === 'nit',
          }"
          ><small>{{ index }}</small
          ><template v-if="prizeAt(index - 1)"
            ><img
              :src="boxPrizeIcon(prizeAt(index - 1)!)"
              alt=""
            /><b>{{ boxPrizeLabel(prizeAt(index - 1)!) }}</b></template
          ></span
        >
      </span>
    </button>
  </div>
</template>
<style scoped>
.boxes-grid {
  flex: 1;
  min-height: 280px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.mystery-box {
  padding: 0;
  border: 0;
  border-radius: 15px;
  background: transparent;
  perspective: 750px;
  color: #fff0cb;
  min-width: 0;
  min-height: 0;
  cursor: pointer;
}
.box-flipper {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 800ms cubic-bezier(0.22, 0.7, 0.2, 1);
}
.opened .box-flipper {
  transform: rotateY(180deg);
}
.box-front,
.box-back {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid #a3b0a945;
  border-radius: 15px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: linear-gradient(140deg, #3b574d, #1c3029);
  box-shadow:
    inset 0 1px #ffffff12,
    0 4px 12px #00000016;
}
.box-front small,
.box-back small {
  position: absolute;
  top: 7px;
  left: 9px;
  font-size: 10px;
  color: #fff0cbab;
  z-index: 2;
}
.ribbon {
  position: absolute;
  inset: 0 42%;
  background: linear-gradient(90deg, #c6a16b55, #e4c58d80, #b18a5655);
}
.ribbon::after {
  content: '';
  position: absolute;
  top: 32%;
  left: -300%;
  width: 700%;
  height: 17%;
  background: #d5b67d55;
}
.bow {
  position: absolute;
  top: -5px;
  font-size: 43px;
  color: #e3c58cb0;
  font-family: Georgia, serif;
  transform: rotate(-8deg);
}
.box-front b {
  font-family: Georgia, serif;
  font-size: 32px;
  z-index: 1;
  margin-top: 12px;
  text-shadow: 0 2px 4px #0008;
}
.box-front i {
  position: absolute;
  right: 7px;
  top: 7px;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  background: #f4d58e;
  color: #453621;
  border-radius: 50%;
  font-style: normal;
  font-size: 12px;
}
.selected .box-front {
  border: 2px solid #e7c577;
  background: linear-gradient(140deg, #55654a, #2a4131);
  box-shadow:
    0 0 0 2px #d9b45c20,
    0 4px 16px #a8874033;
}
.mystery-box:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.mystery-box:disabled {
  cursor: default;
}
.dimmed {
  opacity: 0.42;
}
.box-back {
  transform: rotateY(180deg);
  background: linear-gradient(145deg, #47563b, #253e30);
  border-color: #d9bc7b88;
}
.box-back.elf {
  background: linear-gradient(145deg, #5a3745, #302634);
}
.box-back.miv {
  background: linear-gradient(145deg, #4d465c, #302c3b);
}
.box-back img {
  width: 65%;
  height: 68%;
  object-fit: contain;
  padding-bottom: 10px;
}
.box-back b {
  position: absolute;
  bottom: 7px;
  font-size: 14px;
  color: #c8f3cd;
}
.box-back.elf b {
  color: #ffc0c3;
}
.box-back.miv b {
  color: #e5d6f2;
}

@media (prefers-reduced-motion: reduce) {
  .box-flipper {
    transition: none;
  }
}
</style>
