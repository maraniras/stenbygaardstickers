<script setup lang="ts">
import type { AdventOpening } from '../../shared/types/advent'
import { adventPrizeIcon } from '../../shared/utils/advent-rewards'
const props = defineProps<{ openings: AdventOpening[]; preview: boolean }>()
const emit = defineEmits<{ close: [] }>()
const total = computed(() => props.openings.reduce((sum, opening) => sum + opening.amount, 0))
const format = (value: number) =>
  `${value < 0 ? '−' : '+'}${Math.abs(value).toLocaleString('da-DK')}`
</script>
<template>
  <AppDialog
    label="Mine kalenderfund"
    @close="emit('close')"
  >
    <section class="finds">
      <header>
        <h2>Mine fund</h2>
        <button
          type="button"
          aria-label="Luk mine fund"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>
      <p>{{ openings.length }} af 24 låger åbnet<span v-if="preview"> · Testvisning</span></p>
      <div class="finds-total">
        <span>Bananer fra lågerne</span
        ><strong :class="{ loss: total < 0 }">{{ format(total) }} 🍌</strong>
      </div>
      <p class="explanation">
        {{
          preview
            ? 'Prøvefund giver ingen rigtige præmier eller bananer.'
            : 'Badgebonusser og gaver fra andre vises separat i bananlageret.'
        }}
      </p>
      <p
        v-if="!openings.length"
        class="empty"
      >
        Dine fund dukker op her, når du åbner en låge.
      </p>
      <ol v-else>
        <li
          v-for="opening in openings"
          :key="opening.day"
        >
          <img
            :src="adventPrizeIcon(opening.prize)"
            alt=""
          />
          <div class="find-detail">
            <small>Låge {{ opening.day }}</small
            ><b>{{ opening.prize.title }}</b>
            <span
              v-if="opening.amount"
              :class="['amount', { loss: opening.amount < 0 }]"
              >{{ format(opening.amount) }} 🍌</span
            >
            <span v-else-if="opening.prize.kind === 'friend-gift'">{{
              opening.gift?.deliveredAt
                ? `${preview ? 'Testgave til' : 'Givet til'} ${opening.gift.to}`
                : 'En gave du kan give videre'
            }}</span>
            <span v-if="opening.fulfilment && !preview">{{
              opening.fulfilment === 'pending' ? 'Afventer udlevering' : 'Udleveret'
            }}</span>
            <div
              v-for="(extra, index) in opening.extras"
              :key="index"
              class="extra"
            >
              <img
                :src="adventPrizeIcon(extra)"
                alt=""
              /><span>{{ extra.title }}</span>
            </div>
          </div>
        </li>
      </ol>
      <button
        class="btn close"
        type="button"
        @click="emit('close')"
      >
        Tilbage til kalenderen
      </button>
    </section>
  </AppDialog>
</template>
<style scoped>
.finds {
  padding: 20px 20px calc(20px + var(--safe-b));
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
h2 {
  font-size: 24px;
  margin: 0;
}
header button {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 20px;
}
p {
  color: var(--muted);
  font-size: 13px;
  margin: 6px 0 16px;
}
.finds-total {
  background: var(--surface-2);
  border: 1px solid var(--hairline);
  padding: 14px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
strong,
.amount {
  color: #27835e;
}
strong {
  font-size: 22px;
  white-space: nowrap;
}
.loss {
  color: #cf626c;
}
.explanation {
  font-size: 11px;
  margin-top: 9px;
}
.empty {
  padding: 24px 0;
  text-align: center;
}
ol {
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--hairline);
}
li > img {
  width: 68px;
  height: 68px;
  object-fit: contain;
  flex-shrink: 0;
}
.find-detail {
  min-width: 0;
  display: grid;
  gap: 4px;
  font-size: 12px;
}
.find-detail b {
  font-size: 15px;
}
small,
.find-detail > span:not(.amount) {
  color: var(--muted);
}
.amount {
  font-weight: 800;
}
.extra {
  display: flex;
  align-items: center;
  gap: 6px;
}
.extra img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}
.close {
  width: 100%;
  margin-top: 18px;
}
:global(html[data-appearance='dark']) .amount,
:global(html[data-appearance='dark']) strong {
  color: #6ecb9d;
}
:global(html[data-appearance='dark']) .loss {
  color: #ed8c96;
}
</style>
