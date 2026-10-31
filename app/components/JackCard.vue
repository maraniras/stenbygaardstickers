<script setup lang="ts">
import { jackCardLabel, jackRank } from '../../shared/utils/bananjack'
const props = defineProps<{ card: number | null }>()
const rank = computed(() =>
  props.card === null
    ? ''
    : ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][jackRank(props.card)],
)
const suit = computed(() => (props.card === null ? 0 : Math.floor((props.card % 52) / 13)))
const symbols = ['♠', '♥', '♦', '♣']
</script>
<template>
  <div
    class="jack-card"
    :class="{ back: card === null, red: suit === 1 || suit === 2 }"
    role="img"
    :aria-label="card === null ? 'Skjult kort' : jackCardLabel(card)"
  >
    <img
      v-if="card === null"
      src="/badges/banana-baron.webp"
      alt=""
    />
    <template v-else
      ><b
        >{{ rank }}<small>{{ symbols[suit] }}</small></b
      ><span class="suit">{{ symbols[suit] }}</span
      ><b class="bottom"
        >{{ rank }}<small>{{ symbols[suit] }}</small></b
      ></template
    >
  </div>
</template>
<style scoped>
.jack-card {
  position: relative;
  flex: none;
  width: 62px;
  height: 88px;
  border: 1px solid #fff5d5;
  border-radius: 8px;
  background: linear-gradient(145deg, #fffcf0, #e5dbc2);
  color: #193a30;
  box-shadow: 0 4px 8px #00190e44;
}
.red {
  color: #ad3947;
}
.jack-card > b {
  position: absolute;
  top: 5px;
  left: 6px;
  font:
    700 17px/1 Georgia,
    serif;
}
.jack-card small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
}
.jack-card > .bottom {
  top: auto;
  left: auto;
  right: 6px;
  bottom: 5px;
  transform: rotate(180deg);
}
.suit {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 31px;
}
.back {
  display: grid;
  place-items: center;
  border: 3px solid #d7b672;
  background: repeating-linear-gradient(45deg, #4b305f 0 5px, #543869 5px 10px);
}
.back img {
  width: 35px;
  height: 44px;
  object-fit: contain;
  filter: drop-shadow(0 2px 2px #0005);
}
</style>
