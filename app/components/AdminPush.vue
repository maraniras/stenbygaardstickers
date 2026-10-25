<script setup lang="ts">
// "Få besked om nye stickers" – Web Push til denne telefon. Virker på Android og
// computere; på iPhone kun når appen er føjet til hjemmeskærmen (iOS 16.4+).
const supported = ref(true)
const on = ref(false)
const busy = ref(false)
const message = ref('')
const error = ref('')

function keyBytes(base64: string) {
  const b64 = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

onMounted(async () => {
  supported.value = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported.value) return
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const r = await $fetch<{ subscribed: boolean }>('/api/admin/push', { query: { endpoint: sub.endpoint } }).catch(() => undefined)
  on.value = Boolean(r?.subscribed)
})

async function enable() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    error.value = 'Notifikationer er blokeret. Slå dem til for appen i telefonens indstillinger.'
    return
  }
  const { publicKey } = await $fetch<{ publicKey: string }>('/api/admin/push')
  const reg = await registration()
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
  await $fetch('/api/admin/push', { method: 'POST', body: sub.toJSON() })
  on.value = true
  message.value = 'Du får nu besked, når nogen indsender en sticker.'
}

async function disable() {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await $fetch('/api/admin/push', { method: 'DELETE', body: { endpoint: sub.endpoint } })
    await sub.unsubscribe()
  }
  on.value = false
  message.value = ''
}

async function toggle() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await (on.value ? disable() : enable())
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Det lykkedes ikke'
  }
  finally {
    busy.value = false
  }
}

async function test() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/push/test', { method: 'POST' })
    message.value = 'Testbesked sendt – den burde dukke op om et øjeblik.'
  }
  catch {
    error.value = 'Kunne ikke sende testbesked'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="push">
    <h2 class="eyebrow">Notifikationer</h2>
    <template v-if="supported">
      <button class="toggle" :class="{ on }" :disabled="busy" role="switch" :aria-checked="on" @click="toggle">
        <span class="text">
          <b>Få besked om nye stickers</b>
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
