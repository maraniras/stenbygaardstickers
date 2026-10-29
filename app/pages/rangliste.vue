<script setup lang="ts">
type Metric = 'points' | 'level' | 'badges' | 'stickers' | 'countries'
const options: { key: Metric, label: string, unit: string }[] = [
  { key: 'points', label: 'Point', unit: 'point' },
  { key: 'level', label: 'Level', unit: 'level' },
  { key: 'badges', label: 'Badges', unit: 'badges' },
  { key: 'stickers', label: 'Stickers', unit: 'stickers' },
  { key: 'countries', label: 'Lande', unit: 'lande' },
]
const metric = ref<Metric>('points')
const query = ref('')
const registeredOnly = ref(false)
const busy = ref(true)
const { name: me } = useUser()
const { users, failed: usersFailed, reload: reloadUsers } = useUsers()
const { stickers, people } = useStickers()
const { ratings, enabled: ratingsEnabled, reload: reloadRatings } = useRatings()
const { commentStats, failed: commentsFailed, reload: reloadComments } = useCommentStats()
useHead({ title: 'Ranglisten · Stenbygaard Stickers' })

async function refresh() {
  busy.value = true
  try { await Promise.all([reloadUsers(), reloadRatings(), reloadComments()]) }
  finally { busy.value = false }
}
onMounted(refresh)
const key = (name: string) => name.normalize('NFC').toLocaleLowerCase('da')
const rows = computed(() => {
  const names = new Map<string, { name: string, registered: boolean }>()
  for (const p of people.value) names.set(key(p.name), { name: p.name, registered: false })
  for (const u of users.value) names.set(key(u.name), { name: u.name, registered: true })
  return [...names.values()].map(person => {
    const mine = stickers.value.filter(s => s.placedBy.some(n => sameName(n, person.name)))
    const badges = badgesFor(person.name, stickers.value, ratings.value, { comments: commentStats.value })
    const points = totalPoints(badges)
    const level = levelFor(points)
    return { ...person, points, level: level.level, title: level.title, badges: earnedCount(badges), stickers: mine.length, countries: new Set(mine.map(s => s.countryCode)).size }
  })
})
const ranked = computed(() => {
  const sorted = rows.value.filter(p => !registeredOnly.value || p.registered).sort((a, b) => b[metric.value] - a[metric.value] || b.points - a.points || a.name.localeCompare(b.name, 'da'))
  let rank = 0
  return sorted.map((p, i) => {
    if (i === 0 || p[metric.value] !== sorted[i - 1]![metric.value]) rank = i + 1
    return { ...p, rank }
  })
})
// Søgning ændrer ikke folks placering på den valgte rangliste.
const shown = computed(() => ranked.value.filter(p => key(p.name).includes(key(query.value.trim()))))
const mine = computed(() => ranked.value.find(p => me.value && sameName(p.name, me.value)))
const selected = computed(() => options.find(o => o.key === metric.value)!)
const format = (n: number) => n.toLocaleString('da-DK')
function unit(n: number) {
  if (n === 1 && metric.value === 'stickers') return 'sticker'
  if (n === 1 && metric.value === 'countries') return 'land'
  if (n === 1 && metric.value === 'badges') return 'badge'
  return selected.value.unit
}
const router = useRouter()
function back() {
  if (window.history.state?.back) router.back()
  else router.push('/spil')
}
</script>

<template>
  <div class="rank-page">
    <header>
      <button class="back" aria-label="Tilbage" @click="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
      <div class="heading-row"><div><span class="eyebrow">Hele fællesskabet</span><h1>Ranglisten</h1></div><img class="world" src="/badges/world.webp" alt=""></div>
      <p class="intro">Små stickers. Store ambitioner.</p>
    </header>

    <div v-if="mine && !busy && !usersFailed" class="your-rank"><span class="rank-number">#{{ mine.rank }}</span><div><b>Din placering</b><span>{{ metric === 'level' ? `Level ${mine.level}` : `${format(mine[metric])} ${unit(mine[metric])}` }} · {{ mine.title }}</span></div><LevelBadge :level="mine.level" :size="36" /></div>

    <div class="controls">
      <label class="field"><span>Søg efter en person</span><input v-model="query" type="search" placeholder="Fx Mathias" autocomplete="off"></label>
      <label class="field"><span>Rangér efter</span><select v-model="metric"><option v-for="o in options" :key="o.key" :value="o.key">{{ o.label }}</option><option disabled>Bananer · kommer</option></select></label>
    </div>
    <label class="registered"><input v-model="registeredOnly" type="checkbox">Kun oprettede brugere</label>

    <div class="list-heading"><span>{{ busy ? 'Henter profiler…' : `${shown.length} ${shown.length === 1 ? 'profil' : 'profiler'}` }}</span><span>{{ selected.label }}</span></div>
    <p v-if="busy" class="empty" role="status">Henter fællesskabet…</p>
    <div v-else-if="usersFailed" class="empty" role="alert"><p>Kunne ikke hente brugerne.</p><button class="btn secondary" @click="refresh">Prøv igen</button></div>
    <template v-else>
      <div v-if="commentsFailed || !ratingsEnabled" class="warning" role="status">Point og badges kan være ufuldstændige, fordi nogle tal ikke kunne hentes. <button @click="refresh">Prøv igen</button></div>
      <ol v-if="shown.length" class="ranking" aria-label="Profiler sorteret efter den valgte kategori">
        <li v-for="p in shown" :key="key(p.name)">
          <NuxtLink class="person" :class="{ yours: me && sameName(p.name, me) }" :to="personUrl(p.name)">
            <div class="person-top"><span class="position">{{ p.rank }}</span><UserAvatar class="avatar" :name="p.name" /><div class="person-info"><div class="name"><b>{{ p.name }}</b><span v-if="me && sameName(p.name, me)" class="you">Dig</span></div><span class="level-text">Level {{ p.level }} · {{ format(p.points) }} point</span></div><LevelBadge :level="p.level" :size="30" /><div class="score"><b>{{ format(p[metric]) }}</b><span>{{ unit(p[metric]) }}</span></div></div>
            <div class="person-stats"><span><b>{{ p.badges }}</b> badges</span><span><b>{{ p.stickers }}</b> {{ p.stickers === 1 ? 'sticker' : 'stickers' }}</span><span><b>{{ p.countries }}</b> {{ p.countries === 1 ? 'land' : 'lande' }}</span></div>
            <span v-if="!p.registered" class="unclaimed">Navn fra stickers · har ikke valgt bruger endnu</span>
          </NuxtLink>
        </li>
      </ol>
      <p v-else class="empty">{{ query ? 'Ingen navne matcher din søgning.' : registeredOnly ? 'Ingen oprettede brugere endnu.' : 'Ingen profiler endnu.' }}</p>
    </template>
    <div class="banana-note"><span aria-hidden="true">🍌</span><div><b>Plads til bananbaronerne</b><p>Bananer kommer på ranglisten, når valutaen åbner.</p></div></div>
    <p class="footnote">Samme resultat deler placering. Badges tælles som på profilen; et højere trin tæller stadig som én badge.</p>
  </div>
</template>

<style scoped>
.rank-page { max-width: 600px; margin: 0 auto; padding: calc(20px + var(--safe-t)) 16px calc(var(--nav-space) + 18px); }
.back { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; background: var(--surface); color: var(--text); cursor: pointer; box-shadow: var(--shadow-sm); }
.back svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.heading-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; }.heading-row .eyebrow { font-size: 10px; }h1 { margin-top: 4px; font-size: 34px; }.world { width: 56px; height: 56px; object-fit: contain; }.intro { margin: 8px 0 20px; font-size: 14px; color: var(--muted); }
.your-rank { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; background: var(--accent-soft); }.rank-number { font-size: 25px; font-weight: 800; }.your-rank > div { display: flex; flex: 1; flex-direction: column; gap: 2px; }.your-rank b { font-size: 13px; }.your-rank div > span { color: var(--muted); font-size: 11px; }
.controls { display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px; margin-top: 20px; }.field { display: flex; min-width: 0; flex-direction: column; gap: 6px; }.field > span { color: var(--muted); font-size: 11px; font-weight: 600; }.field input,.field select { width: 100%; min-width: 0; height: 46px; padding: 0 10px; border: 1px solid var(--hairline); border-radius: 12px; background: var(--surface); color: var(--text); font: inherit; font-size: 16px; }.field select { padding-right: 3px; }
.registered { display: flex; align-items: center; gap: 8px; min-height: 44px; margin-top: 5px; color: var(--muted); font-size: 12px; }.registered input { width: 17px; height: 17px; accent-color: var(--accent); }
.list-heading { display: flex; justify-content: space-between; padding: 12px 12px 9px; color: var(--muted); font-size: 11px; font-weight: 700; }
.ranking { display: flex; flex-direction: column; gap: 9px; margin: 0; padding: 0; list-style: none; }.person { display: block; padding: 13px 12px; border: 1px solid var(--hairline); border-radius: 18px; background: var(--surface); color: var(--text); text-decoration: none; box-shadow: var(--shadow-sm); }.person.yours { border-color: var(--accent); }.person-top { display: flex; align-items: center; gap: 9px; }.position { flex: none; min-width: 15px; color: var(--muted); text-align: center; font-size: 12px; font-weight: 700; }.avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--accent); color: var(--on-accent); font-size: 17px; font-weight: 800; }.person-info { flex: 1; min-width: 0; }.name { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }.name b { font-size: 14px; overflow-wrap: anywhere; }.you { padding: 1px 5px; border-radius: 5px; background: var(--accent-soft); font-size: 9px; font-weight: 700; }.level-text { display: block; margin-top: 3px; color: var(--muted); font-size: 10px; }.score { flex: none; min-width: 38px; text-align: right; }.score b { display: block; font-size: 22px; font-variant-numeric: tabular-nums; line-height: 1.2; }.score span { color: var(--muted); font-size: 9px; }
.person-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--hairline); color: var(--muted); font-size: 10px; text-align: center; }.person-stats b { color: var(--text); font-size: 12px; }.unclaimed { display: block; margin-top: 9px; color: var(--muted); font-size: 10px; }
.banana-note { display: flex; gap: 11px; align-items: center; padding: 18px 3px 0; }.banana-note > span { font-size: 25px; }.banana-note b { font-size: 12px; }.banana-note p,.footnote { margin: 3px 0 0; color: var(--muted); font-size: 11px; }.footnote { margin-top: 18px; line-height: 1.7; }.empty { padding: 25px 8px; color: var(--muted); text-align: center; font-size: 14px; }.warning { margin-bottom: 12px; color: var(--muted); font-size: 12px; }.warning button { border: 0; background: none; color: var(--text); text-decoration: underline; cursor: pointer; }
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }
@media (max-width:350px) { .person-top { gap: 6px; }.avatar { width: 32px; height: 32px; }.score b { font-size: 19px; }.rank-page { padding-left: 12px; padding-right: 12px; } }
</style>
