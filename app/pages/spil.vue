<script setup lang="ts">
useHead({ title: 'Dagens spil · Stenbygaard Stickers' })
const selected = ref<'city' | 'wheel' | null>(null)
</script>

<template>
  <div class="daily-page">
    <header>
      <div class="brand"><img src="/marker.png" alt=""><span>Stenbygaard Stickers</span><span class="preview">Smugkig</span></div>
      <div class="heading-line"><h1>Dagens spil<span class="title-dot">.</span></h1><NuxtLink class="ranking-link" to="/rangliste">Rangliste <span aria-hidden="true">↗</span></NuxtLink></div>
      <p class="lead">En lille pause. Måske flere bananer.</p>
    </header>


    <div class="daily-reset"><span class="reset-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><div><b>En ny chance hver dag</b><span>Spildøgnet skifter kl. 04.00 dansk tid</span></div></div>

    <article class="city-card game-card">
      <div class="city-visual">
        <DailyGameArt kind="city" />
        <span class="game-label">Dagens hovedstad</span>
        <span class="visual-title">Hvor er<br>Emil nu?</span>
      </div>
      <div class="card-body">
        <h2>Emil er faret vild</h2>
        <p>Find byen fra oven. Emil har ingen anelse.</p>
        <div class="card-bottom"><span class="game-meta"><b>5</b> gæt <i /> <b>6</b> byer</span><button class="game-link" @click="selected = 'city'">Se spillet <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></button></div>
      </div>
    </article>

    <article class="wheel-card game-card">
      <div class="wheel-copy"><span class="wheel-kicker">Lidt held skal man have</span><h2>Dagens<br>lykkehjul</h2><p>Ét gratis spin.<br>Bananer eller bare… øv.</p></div>
      <DailyGameArt kind="wheel" />
      <div class="wheel-bottom"><span class="game-meta">Gratis hver dag</span><button class="game-link" @click="selected = 'wheel'">Se spillet <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></button></div>
    </article>

    <div class="daily-footer"><img src="/badges/streak.webp" alt=""><div><b>Gør det til en vane</b><p>Daglige spil, streaks og nye badges er på vej.</p></div></div>
    <DailyGameSheet v-if="selected" :kind="selected" @close="selected = null" />
  </div>
</template>

<style scoped>
.daily-page { max-width: 480px; margin: 0 auto; padding: calc(22px + var(--safe-t)) 18px calc(var(--nav-space) + 18px); }
.brand { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 11px; font-weight: 700; }.brand img { width: 24px; height: 28px; object-fit: contain; }
.preview { margin-left: auto; padding: 3px 8px; border: 1px solid var(--hairline); border-radius: 7px; font-size: 10px; }
h1 { margin-top: 15px; font-size: 36px; letter-spacing: -.045em; }.title-dot { color: var(--accent); }
.lead { margin: 10px 0 0; color: var(--muted); font-size: 14px; line-height: 1.65; }
.heading-line { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 15px; }.heading-line h1 { margin-top: 0; }.ranking-link { display: inline-flex; align-items: center; gap: 5px; flex: none; min-height: 44px; color: var(--muted); font-size: 11px; font-weight: 700; text-decoration: none; }.ranking-link:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }
.daily-reset { display: flex; align-items: center; gap: 10px; margin: 20px 0; }.reset-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-sm); }.daily-reset b { display: block; font-size: 12px; }.daily-reset div > span { display: block; color: var(--muted); font-size: 11px; margin-top: 1px; }
svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.game-card { overflow: hidden; border-radius: 24px; background: var(--surface); box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--hairline); }
.city-visual { position: relative; }.game-label { position: absolute; top: 16px; left: 18px; padding: 5px 9px; border-radius: 7px; background: #d7ebbe; color: #203e35; font-size: 10px; font-weight: 800; }
.visual-title { position: absolute; left: 18px; top: 57px; color: #f1f8e7; font-size: 27px; font-weight: 800; line-height: 1.12; letter-spacing: -.04em; }
.card-body { padding: 19px 18px 10px; }h2 { font-size: 23px; letter-spacing: -.04em; }.card-body > p { margin: 8px 0 10px; color: var(--muted); font-size: 13px; line-height: 1.6; }
.card-bottom, .wheel-bottom { display: flex; justify-content: space-between; align-items: center; gap: 10px; }.game-meta { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 11px; }.game-meta b { color: var(--text); }.game-meta i { width: 3px; height: 3px; margin: 0 3px; border-radius: 50%; background: var(--muted); }
.game-link { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 0 0 8px; border: 0; background: transparent; color: var(--text); font-size: 13px; font-weight: 800; cursor: pointer; }.game-link svg { transition: transform .15s; }.game-link:hover svg { transform: translateX(3px); }.game-link:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; border-radius: 5px; }
.wheel-card { display: grid; grid-template-columns: 1fr 1fr; margin-top: 16px; background: light-dark(#f7f2fd, #282032); }
.wheel-copy { position: relative; z-index: 1; padding: 20px 0 0 18px; }.wheel-kicker { display: block; color: var(--muted); font-size: 10px; font-weight: 600; }.wheel-copy h2 { margin-top: 8px; font-size: 26px; }.wheel-copy p { margin: 9px 0 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
.wheel-bottom { grid-column: 1 / -1; padding: 0 18px 9px; }.wheel-bottom .game-meta { font-weight: 600; }
.daily-footer { display: flex; align-items: center; gap: 10px; padding: 22px 5px 0; }.daily-footer img { width: 36px; height: 36px; object-fit: contain; }.daily-footer b { font-size: 12px; }.daily-footer p { margin: 2px 0 0; color: var(--muted); font-size: 11px; }
@media (prefers-reduced-motion: reduce) { .game-link svg { transition: none; } }
@media (max-width: 350px) { .daily-page { padding-right: 14px; padding-left: 14px; }.heading-line h1 { font-size: 32px; }.visual-title { font-size: 24px; }.wheel-copy h2 { font-size: 24px; }.wheel-kicker { max-width: 120px; } }
</style>
