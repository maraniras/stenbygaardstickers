<script setup lang="ts">
const { users } = useUsers()
</script>
<template>
  <NuxtLink
    class="community-link"
    to="/rangliste"
  >
    <span
      class="community-icon"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24">
        <circle
          cx="9"
          cy="8"
          r="3"
        />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2" />
      </svg>
    </span>
    <span class="copy"
      ><b>Brugere &amp; rangliste</b><span>Find venner og sammenlign jeres fremskridt</span></span
    >
    <span
      class="avatars"
      aria-hidden="true"
      ><UserAvatar
        v-for="user in users.slice(0, 3)"
        :key="user.name"
        :name="user.name"
        class="avatar"
    /></span>
    <span
      class="arrow"
      aria-hidden="true"
      >›</span
    >
  </NuxtLink>
</template>
<style scoped>
.community-link {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px;
  margin: 16px 0;
  border: 1px solid var(--hairline);
  border-radius: 19px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
}
.community-icon {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--text);
}
svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
}
.copy {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
}
b {
  font-size: 14px;
}
.copy > span {
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
}
.avatars {
  display: flex;
  padding-left: 6px;
}
.avatar {
  width: 25px;
  height: 25px;
  margin-left: -6px;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--surface-2);
  font-size: 10px;
}
.arrow {
  color: var(--muted);
  font-size: 24px;
}
@media (max-width: 360px) {
  .avatars {
    display: none;
  }
}
</style>
