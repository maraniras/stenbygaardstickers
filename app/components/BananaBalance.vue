<script setup lang="ts">
defineProps<{ balance: number }>()
</script>
<template>
  <div class="balance-actions">
    <NuxtLink
      class="market-link"
      to="/marked"
      aria-label="Åbn aktiemarkedet"
      title="Aktiemarked"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 4v16h16M7 14l4-4 4 3 5-7M16 6h4v4" />
      </svg>
    </NuxtLink>
    <NuxtLink
      class="banana-balance"
      to="/spil/bananer"
      :aria-label="`Åbn dit bananlager, ${balance.toLocaleString('da-DK')} bananer`"
      title="Dit bananlager"
    >
      <img
        src="/badges/banana-baron.webp"
        alt=""
      /><span>{{ balance.toLocaleString('da-DK') }}</span
      ><svg
        class="arrow"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m6 4 4 4-4 4"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </NuxtLink>
  </div>
</template>
<style scoped>
.balance-actions {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 6px;
}
.market-link {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border: 1px solid var(--hairline);
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--text);
  text-decoration: none;
}
.market-link svg {
  width: 23px;
  height: 23px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.banana-balance {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  background: var(--accent-soft);
  color: var(--text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
img {
  width: 23px;
  height: 23px;
  object-fit: contain;
}
.arrow {
  display: block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-left: 2px;
  color: var(--muted);
}
a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}
</style>
