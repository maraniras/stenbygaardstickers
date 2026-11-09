<script setup lang="ts">
import type { AdventGiftReceipt } from '../../shared/types/advent'
defineProps<{ gifts: AdventGiftReceipt[] }>()
const emit = defineEmits<{ close: [] }>()
</script>
<template>
  <AppDialog
    label="Du har fået en julegave!"
    centered
    @close="emit('close')"
  >
    <div class="gift-popup">
      <img
        src="/games/advent/gift-friend-christmas-v1.webp"
        alt=""
      />
      <h2>{{ gifts.length === 1 ? 'Du har fået en julegave!' : 'Der er julegaver til dig!' }}</h2>
      <ul>
        <li
          v-for="gift in gifts"
          :key="gift.id"
        >
          <b>{{ gift.from }}</b> har givet dig
          <strong>{{ gift.amount.toLocaleString('da-DK') }} 🍌</strong>
        </li>
      </ul>
      <p>Bananerne er allerede lagt i dit lager.</p>
      <button
        class="btn"
        @click="emit('close')"
      >
        Tak for gaven!
      </button>
    </div>
  </AppDialog>
</template>
<style scoped>
.gift-popup {
  padding: 20px 24px 26px;
  text-align: center;
}
img {
  display: block;
  width: 150px;
  height: 150px;
  object-fit: contain;
  margin: 0 auto 10px;
}
h2 {
  font-size: 23px;
}
ul {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  max-height: 32dvh;
  overflow-y: auto;
}
li {
  padding: 9px 0;
  font-size: 14px;
}
strong {
  display: block;
  font-size: 21px;
  color: var(--title, var(--text));
}
p {
  font-size: 12px;
  color: var(--muted);
  margin: 12px 0 20px;
}
.btn {
  width: 100%;
}
</style>
