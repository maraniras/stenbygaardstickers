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
    <img class="logo" src="/logo.png" alt="">
    <h1>Stenbygaard<br><span>Stickers</span></h1>
    <form :class="{ wrong }" @submit.prevent="submit">
      <input
        v-model="code"
        type="password"
        inputmode="text"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        placeholder="Kode"
        aria-label="Kode"
        autofocus
      >
      <button class="btn" type="submit">Lås op</button>
    </form>
    <p v-if="wrong" class="err">Forkert kode – prøv igen.</p>
  </div>
</template>

<style scoped>
.lock {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: calc(24px + var(--safe-t)) 24px calc(24px + var(--safe-b));
  text-align: center;
  background:
    radial-gradient(circle at 50% 30%, #fff6cf 0, transparent 60%),
    var(--paper);
}
.logo {
  width: 180px;
  height: 180px;
  object-fit: contain;
  padding: 10px;
  border: 3px solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 5px 5px 0 var(--ink);
  transform: rotate(-6deg);
}
h1 {
  font-size: 40px;
}
h1 span {
  display: inline-block;
  margin-top: 4px;
  padding: 0 10px;
  background: var(--ink);
  color: var(--yellow);
  transform: rotate(-2deg);
}
form {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 340px;
}
form.wrong { animation: shake .35s; }
input {
  flex: 1;
  min-width: 0;
  height: 48px;
  padding: 0 18px;
  border: 2.5px solid var(--ink);
  border-radius: 999px;
  background: #fff;
  font-size: 17px;
  outline: none;
}
input:focus { box-shadow: 0 0 0 3px var(--yellow); }
.err {
  margin: 0;
  color: #c2361b;
  font-weight: 600;
}
@keyframes shake {
  25% { transform: translateX(-8px); }
  50% { transform: translateX(7px); }
  75% { transform: translateX(-4px); }
}
</style>
