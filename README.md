# Stenbygaard Stickers

Kort og tidslinje over alle Stenbygaard-stickers i verden. Nuxt 4, hostet på Vercel.

```bash
npm install
npm run dev
```

## Ny sticker

```bash
node scripts/add-sticker.mjs --lat 48.8584 --lng 2.2945 --title "Eiffeltårnet" --date 2026-10-22 --by "Emil, Eric" --desc "Tekst" billede.jpg video.mov
```

Scriptet finder by og land ud fra koordinatet, komprimerer billeder og videoer til `public/media/<id>/` og skriver `app/data/stickers/<id>.json`. Commit og push, så deployer Vercel.

Koden til appen er `emileric`.
