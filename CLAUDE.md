# Stenbygaard Stickers

Kort over stickers (med Stenbygaard-hovedet) sat op rundt om i verden. Talk to the user in Danish; the app UI is Danish. Mobile first, deployed on Vercel.

- Nuxt 4, `ssr: false`. Pages: `/` map (Leaflet + markercluster, OSM tiles), `/liste` timeline + stats, `/sticker/[id]` detail with gallery.
- No database and no upload UI: stickers are JSON files in `app/data/stickers/<id>.json`, loaded at build time via `import.meta.glob` in `app/utils/stickers.ts`. Media in `public/media/<id>/`.
- **Adding a sticker** (the user gives coordinate, title, date, names, description and media): run
  `node scripts/add-sticker.mjs --lat <lat> --lng <lng> --title "…" --date YYYY-MM-DD --by "Navn1, Navn2" --desc "…" <filer…>`.
  It reverse-geocodes city/country with Nominatim (Danish names), converts images to webp (max 1600px) and videos to mp4 (H.264, max 1080px, ≤15 s) with a poster. Check the printed city; override with `--city/--country/--cc` if wrong. `--force` rewrites an existing id. Then commit and push → Vercel deploys.
- The three `eksempel-*` stickers are demo data; delete them (JSON + `public/media/eksempel-paris`) when the first real sticker is added.
- Distances are measured from Aalborg (`AALBORG` in `app/utils/stickers.ts`).
- Code lock: `emileric` (`app/composables/useUnlock.ts`), client-side only.
- Icons: `npm run icons` regenerates favicon/PWA icons/marker from `branding/logo.png`.
- `npx nuxi typecheck` must pass.
