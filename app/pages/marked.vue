<script setup lang="ts">
useHead({ title: 'Aktiemarked · Stenbygaard Stickers' })
const { state } = useEconomy()
</script>

<template>
  <div class="market-page">
    <PageHeader
      title="Aktiemarked"
      back-to="/"
      back-label="Tilbage til Udforsk"
    >
      <template #actions>
        <BananaBalance
          v-if="state"
          :balance="state.wallet.balance"
        />
      </template>
    </PageHeader>
    <section class="market-preview">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 4v16h16M7 14l4-4 4 3 5-7M16 6h4v4" />
      </svg>
      <span class="eyebrow">På vej i version 3.0</span>
      <h2>Et nyt sted til dine bananer</h2>
      <p>Investér i fiktive aktier, følg kurserne og byg din egen portefølje.</p>
      <p class="hint">Aktiemarkedet er under udvikling. Handel åbner senere.</p>
    </section>
  </div>
</template>

<style scoped>
.market-page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 24px;
}
.market-preview {
  display: grid;
  justify-items: start;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--hairline);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.market-preview svg {
  width: 52px;
  height: 52px;
  color: var(--accent);
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.market-preview p {
  margin: 0;
  line-height: 1.6;
}
.hint {
  color: var(--muted);
}
</style>
