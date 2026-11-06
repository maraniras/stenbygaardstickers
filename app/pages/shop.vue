<script setup lang="ts">
useHead({ title: 'Shop · Stenbygaard Stickers' })
</script>

<template>
  <div class="shop-page">
    <header>
      <span class="eyebrow">Brug dine bananer</span>
      <h1>Shop<span>.</span></h1>
    </header>
    <section
      class="coming-soon"
      aria-labelledby="shop-coming-soon"
    >
      <div
        class="shop-icon"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24">
          <path d="m8 3-4 7m12-7 4 7M2 10h20l-3 11H5L2 10Zm7 4v3m6-3v3" />
        </svg>
      </div>
      <span class="soon-label">Noget at spare op til</span>
      <h2 id="shop-coming-soon">Kommer snart</h2>
      <p>Her kan du snart bruge dine optjente bananer.</p>
    </section>
  </div>
</template>

<style scoped>
.shop-page {
  max-width: 480px;
  min-height: calc(100dvh - var(--nav-space));
  margin: 0 auto;
  padding: calc(24px + var(--safe-t)) 20px 32px;
  display: flex;
  flex-direction: column;
}
.eyebrow {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
h1 {
  margin-top: 8px;
  font-size: 36px;
  letter-spacing: -0.045em;
}
h1 span {
  color: var(--accent);
}
.coming-soon {
  margin: auto 0;
  padding: 36px 0;
  text-align: center;
}
.shop-icon {
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  display: grid;
  place-items: center;
  border-radius: 30px;
  background: var(--accent-soft);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  transform: rotate(-7deg);
}
svg {
  width: 48px;
  height: 48px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.soon-label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
h2 {
  margin-top: 8px;
  font-size: 28px;
}
p {
  max-width: 28ch;
  margin: 14px auto 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}
</style>
