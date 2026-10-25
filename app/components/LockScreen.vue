<script setup lang="ts">
const { tryUnlock } = useUnlock()
const code = ref('')
const wrong = ref(false)

function submit() {
  if (tryUnlock(code.value)) return
  wrong.value = false
  requestAnimationFrame(() => (wrong.value = true))
  code.value = ''
}
</script>

<template>
  <div class="lock">
    <div class="logo">
      <img src="/logo.png" alt="">
    </div>
    <h1>Stenbygaard Stickers</h1>
    <p class="sub">Indtast koden for at se kortet</p>
    <form :class="{ wrong }" @submit.prevent="submit">
      <input
        v-model="code"
        type="password"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        placeholder="Kode"
        aria-label="Kode"
        autofocus
      >
      <button class="btn" type="submit">Lås op</button>
    </form>
    <p class="err" :class="{ show: wrong }">Forkert kode – prøv igen</p>
  </div>
</template>

<style scoped>
.lock {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: calc(24px + var(--safe-t)) 24px calc(24px + var(--safe-b));
  text-align: center;
  background:
    radial-gradient(60% 40% at 50% 28%, var(--accent-soft) 0, transparent 100%),
    var(--bg);
}
.logo {
  display: grid;
  place-items: center;
  width: 148px;
  height: 148px;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(160deg, var(--accent-light), var(--accent));
  box-shadow: 0 20px 50px rgba(255, 185, 0, .35);
}
.logo img {
  width: 86%;
  height: 86%;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .25));
}
h1 {
  margin-top: 28px;
  font-size: 28px;
}
.sub {
  margin: 6px 0 28px;
  color: var(--muted);
}
form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 320px;
}
form.wrong { animation: shake .35s; }
input {
  height: 54px;
  padding: 0 18px;
  border: 1px solid var(--hairline);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 17px;
  text-align: center;
  outline: none;
  transition: box-shadow .15s;
}
input:focus { box-shadow: 0 0 0 4px rgba(255, 201, 40, .45); }
.btn { min-height: 54px; }
.err {
  margin: 14px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: #d33a2c;
  opacity: 0;
  transition: opacity .2s;
}
.err.show { opacity: 1; }
@keyframes shake {
  25% { transform: translateX(-8px); }
  50% { transform: translateX(7px); }
  75% { transform: translateX(-4px); }
}
</style>
