<script setup lang="ts">
useHead({ title: 'Casino · Stenbygaard Stickers' })
const { state } = useEconomy()
</script>

<template>
  <div class="casino-page">
    <header>
      <div class="brand"><img src="/marker.png" alt=""><span>Stenbygaard Stickers</span><NuxtLink v-if="state" class="balance" to="/spil/bananer">🍌 {{ state.wallet.balance.toLocaleString('da-DK') }}</NuxtLink></div>
      <div class="heading-line"><h1>Spil<span>.</span></h1><NuxtLink class="ranking-link" to="/rangliste">Rangliste ↗</NuxtLink></div>
      <p class="lead">Lidt held. Lidt taktik. En håndfuld bananer.</p>
    </header>
    <GameSectionNav section="casino" />

    <article class="bananjack-card" aria-labelledby="bananjack-title">
      <div class="card-top"><span class="table-label">EMILS SPILLEBORD</span><span class="status">Undervejs</span></div>
      <div class="table-art" aria-hidden="true">
        <div class="table-ring" />
        <div class="playing-card ace"><b>A</b><svg viewBox="0 0 32 40"><path d="M16 2C11 9 2 14 2 22c0 7 8 10 13 5-1 5-3 8-6 10h14c-3-2-5-5-6-10 5 5 13 2 13-5C30 14 21 9 16 2Z" /></svg><b class="corner">A</b></div>
        <div class="playing-card king"><b>K</b><img src="/marker.png" alt=""><b class="corner">K</b></div>
        <span class="chip chip-one" /><span class="chip chip-two" /><span class="chip chip-three" />
        <img class="banana" src="/badges/banana-baron.webp" alt="">
      </div>
      <div class="game-copy"><span class="eyebrow">Første spil i casinoet</span><h2 id="bananjack-title">Banan<span>jack</span></h2><p>Kom tæt på 21. Hold hovedet koldt, selv når Emil ikke gør.</p><div class="game-details"><span>Én spiller</span><span>10–50 🍌 pr. hånd</span></div></div>
    </article>
    <p class="coming-note">Vi gør kortene klar. Bananjack bliver det første spil, du kan spille her.</p>
    <NuxtLink class="daily-link" to="/spil"><span>Mens du venter</span><b>Tag dagens gratis spil <span aria-hidden="true">→</span></b></NuxtLink>
    <NuxtLink class="wallet-link" to="/spil/bananer">Dit bananlager og dine belønninger <span aria-hidden="true">↗</span></NuxtLink>
  </div>
</template>

<style scoped>
.casino-page { max-width:480px; margin:0 auto; padding:calc(22px + var(--safe-t)) 18px calc(var(--nav-space) + 18px); }
.brand { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:11px; font-weight:700; }.brand > img { width:24px; height:28px; object-fit:contain; }.balance { display:flex; align-items:center; margin-left:auto; min-height:36px; padding:5px 9px; border-radius:9px; background:var(--accent-soft); color:var(--text); text-decoration:none; font-size:12px; font-variant-numeric:tabular-nums; }
.heading-line { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:15px; }h1 { font-size:36px; letter-spacing:-.045em; }h1 > span { color:var(--accent); }.ranking-link { display:flex; align-items:center; min-height:44px; color:var(--muted); font-size:11px; font-weight:700; text-decoration:none; }.lead { margin:10px 0 0; color:var(--muted); font-size:14px; }
.bananjack-card { position:relative; overflow:hidden; border:1px solid #cda75f55; border-radius:26px; background:radial-gradient(ellipse at 50% 30%,#29594c 0%,#15392f 45%,#102720 100%); color:#fff8e8; box-shadow:0 12px 30px #10251e20; }
.card-top { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; gap:10px; padding:18px 18px 0; }.table-label { color:#e2cf9a; font-size:9px; font-weight:800; letter-spacing:.16em; }.status { border:1px solid #f1d99b44; border-radius:999px; padding:5px 9px; color:#f1d99b; background:#10271f66; font-size:10px; font-weight:700; }
.table-art { position:relative; height:207px; isolation:isolate; }.table-ring { position:absolute; width:300px; height:180px; left:50%; top:25px; transform:translateX(-50%); border:1px solid #e2cf9a25; border-radius:50%; box-shadow:0 0 0 14px #e2cf9a05,0 0 0 15px #e2cf9a12; }
.playing-card { position:absolute; width:98px; height:142px; top:29px; left:50%; border:1px solid #fff8df; border-radius:12px; background:linear-gradient(145deg,#fffdf4,#e8dfca); color:#19392e; box-shadow:0 10px 16px #001c2455; }.playing-card > b { position:absolute; left:9px; top:7px; font-family:Georgia,serif; font-size:22px; line-height:1; }.playing-card > .corner { top:auto; left:auto; bottom:7px; right:9px; transform:rotate(180deg); }.ace { transform:translateX(-82%) rotate(-17deg); }.ace svg { position:absolute; left:28px; top:43px; width:40px; height:51px; fill:currentColor; }.king { transform:translateX(-6%) rotate(13deg); background:linear-gradient(145deg,#fff8dd,#ead4a1); }.king img { position:absolute; width:58px; height:78px; object-fit:contain; left:19px; top:31px; }
.chip { position:absolute; width:37px; height:37px; border-radius:50%; border:5px dashed #f6e6bd; background:#b98b35; box-shadow:inset 0 0 0 2px #7b5b23,0 3px 0 #8b682d,0 6px 8px #001d2466; }.chip-one { left:calc(50% - 115px); top:151px; transform:rotate(-13deg); }.chip-two { left:calc(50% - 89px); top:160px; transform:rotate(11deg); }.chip-three { left:calc(50% - 91px); top:151px; transform:rotate(31deg); }.banana { position:absolute; width:57px; height:57px; object-fit:contain; left:calc(50% + 56px); top:141px; transform:rotate(14deg); filter:drop-shadow(0 5px 4px #001d2444); }
.game-copy { padding:0 22px 22px; }.eyebrow { color:#e2cf9a; font-size:10px; font-weight:700; }h2 { margin:6px 0 8px; font-size:42px; line-height:1; letter-spacing:-.06em; }h2 > span { color:#efcc7f; }.game-copy p { max-width:270px; margin:0; font-size:13px; line-height:1.6; color:#d7e5db; }.game-details { display:flex; flex-wrap:wrap; gap:8px; margin-top:17px; }.game-details > span { padding:6px 9px; border:1px solid #f1d99b33; border-radius:8px; color:#f3e4bd; font-size:11px; }
.coming-note { margin:14px 6px 18px; color:var(--muted); font-size:12px; line-height:1.6; text-align:center; }.daily-link { display:flex; flex-direction:column; justify-content:center; gap:3px; min-height:70px; padding:12px 16px; border:1px solid var(--hairline); border-radius:17px; background:var(--surface); text-decoration:none; color:var(--text); }.daily-link > span { font-size:10px; color:var(--muted); }.daily-link b { display:flex; justify-content:space-between; gap:8px; font-size:13px; }.wallet-link { display:flex; align-items:center; justify-content:space-between; min-height:48px; margin-top:8px; color:var(--muted); font-size:12px; text-decoration:none; }a:focus-visible { outline:2px solid var(--text); outline-offset:3px; }
@media(max-width:350px) { .casino-page { padding-left:14px; padding-right:14px; }h1 { font-size:32px; }.table-art { height:185px; }.playing-card { top:20px; }.chip-one,.chip-three { top:142px; }.chip-two { top:151px; }.banana { top:132px; }h2 { font-size:38px; } }
</style>
