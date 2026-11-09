<script setup lang="ts">
const { gifts, dismiss } = useAdventGiftInbox()
const route = useRoute()
const { open: installOpen } = useInstall()
const namePrompt = useState('name-prompt', () => 'pending')
const pushPrompt = useState('push-prompt', () => null)
const releaseNews = useState('release-news-pending', () => false)
const badgeSheet = useState('badge-sheet-open', () => false)
const dailyAnimation = useState('daily-game-animation', () => false)
const jackAnimation = useState('bananjack-animation', () => false)
const slotAnimation = useState('slot-animation', () => false)
const open = useState('advent-gift-open', () => false)
const settled = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  timer = setTimeout(() => {
    settled.value = true
  }, 3500)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  open.value = false
})
watchEffect(() => {
  open.value = Boolean(
    gifts.value.length &&
    settled.value &&
    !installOpen.value &&
    namePrompt.value === 'done' &&
    !pushPrompt.value &&
    !releaseNews.value &&
    !badgeSheet.value &&
    route.query.badge === undefined &&
    !dailyAnimation.value &&
    !jackAnimation.value &&
    !slotAnimation.value &&
    route.path !== '/upload' &&
    !route.path.startsWith('/admin') &&
    route.path !== '/spil/julekalender',
  )
})
</script>
<template>
  <AdventGiftNotice
    v-if="open"
    :gifts="gifts"
    @close="dismiss"
  />
</template>
