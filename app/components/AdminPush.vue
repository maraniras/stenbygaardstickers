<script setup lang="ts">
// "Få besked om nye indsendte stickers" – kun for admins
const supported = ref(true)
const { on, busy, refresh, enable, disable } = usePush('admin')
const message = ref('')
const error = ref('')

onMounted(() => {
  supported.value = pushSupported()
  refresh()
})

async function toggle() {
  error.value = ''
  message.value = ''
  try {
    if (on.value) await disable()
    else {
      await enable()
      message.value = 'Du får nu besked, når nogen indsender en sticker.'
    }
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Det lykkedes ikke'
  }
}

async function test() {
  error.value = ''
  try {
    await $fetch('/api/admin/push/test', { method: 'POST' })
    message.value = 'Testbesked sendt – den burde dukke op om et øjeblik.'
  }
  catch {
    error.value = 'Kunne ikke sende testbesked'
  }
}
</script>

<template>
  <section class="push">
    <h2 class="eyebrow">Notifikationer</h2>
    <template v-if="supported">
      <button class="toggle" :class="{ on }" :disabled="busy" role="switch" :aria-checked="on" @click="toggle">
        <span class="text">
          <b>Få besked om nye indsendte stickers</b>
          <span>På denne telefon</span>
        </span>
        <span class="switch"><span /></span>
      </button>
      <button v-if="on" class="btn secondary test" :disabled="busy" @click="test">Send testbesked</button>
    </template>
    <p v-else class="hint-text">
      Denne browser kan ikke vise notifikationer. På iPhone skal appen være føjet til hjemmeskærmen og åbnes derfra.
    </p>
    <p v-if="message" class="hint-text">{{ message }}</p>
    <p v-if="error" class="err">{{ error }}</p>
  </section>
</template>

<style scoped>
.push {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--hairline);
}
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 0;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  text-align: left;
  cursor: pointer;
}
.text { display: flex; flex-direction: column; }
.text span { font-size: 13px; color: var(--muted); }
.switch {
  flex: none;
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: var(--surface-2);
  transition: background .2s;
}
.switch span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform .2s;
}
.toggle.on .switch { background: #34c759; }
.toggle.on .switch span { transform: translateX(20px); }
.test { min-height: 44px; font-size: 15px; }
.hint-text { margin: 0; font-size: 13px; color: var(--muted); }
.err { margin: 0; color: #c62828; font-weight: 600; }
</style>
