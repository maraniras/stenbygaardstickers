# Stenbygaard Stickers

Kort over stickers (med Stenbygaard-hovedet) sat op rundt om i verden. Talk to the user in Danish; the app UI is Danish. Mobile first, deployed on Vercel.

- Nuxt 4, `ssr: false`. Pages: `/` map (Leaflet + markercluster, OSM tiles), `/liste` timeline + stats, `/sticker/[id]` detail with gallery, `/upload` (round + button next to the refresh button on map and list), `/admin` + `/admin/[id]` (small "Admin" link at the bottom of `/liste`).
- **Stickers live in the database**, not the repo: Redis hash `stickers` (id → JSON with `status: 'pending' | 'approved'`), via `server/utils/stickers.ts`. The app fetches approved ones from `/api/stickers` with `useStickers()`; `app.vue` waits for the first fetch, after that it refetches when the app becomes visible/focused and every 60 s (only replaces the list if it changed; the map keeps its view). Types are in `shared/types/sticker.ts`.
- `app/data/stickers/*.json` are only **seed data**: each file is copied into Redis once (ids remembered in set `stickers:seeded`), so later edits/deletes in admin win. A new JSON file is picked up on the next deploy. Repo media stays in `public/media/<id>/`.
- **Upload flow**: anyone with the app code can submit on `/upload` (map picker with geolocation, Google Maps-style coordinate field, name autocomplete, images compressed to webp in the browser, videos uploaded as-is ≤100 MB with a poster frame). Submissions are `pending` until approved on `/admin`, where title, description, names, place, city/country and media can be edited. Rejecting/deleting also deletes uploaded media.
- Uploaded media goes straight from the browser to **Vercel Blob** (a *public* store). New stores only set `BLOB_STORE_ID` and authenticate with OIDC (`x-vercel-oidc-token` header) → presigned uploads via `issueSignedToken`/`uploadPresigned`; older stores with `BLOB_READ_WRITE_TOKEN` use `handleUpload`/`upload`. Both in `server/api/upload.post.ts`. Without the token in dev, files go to `.data/` and are served from `/api/media/<file>`.
- **Admin login**: `ADMIN_PASSWORD` env var on Vercel (httpOnly cookie with an HMAC of it). In dev without it the password is `admin`.
- **Adding a sticker yourself** (the user gives coordinate, title, date, names, description and media): either ask them to use `/upload` + `/admin`, or run
  `node scripts/add-sticker.mjs --lat <lat> --lng <lng> --title "…" --date YYYY-MM-DD --by "Navn1, Navn2" --desc "…" <filer…>`.
  It reverse-geocodes city/country with Nominatim (Danish names), converts images to webp (max 1600px) and videos to mp4 (H.264, max 1080px, ≤15 s) with a poster. Check the printed city; override with `--city/--country/--cc` if wrong. Then commit and push → Vercel deploys and the new file is seeded. Changing an already seeded JSON file does nothing – edit it in `/admin` instead.
- Users can click a name → `/person/<navn>` (list) and `/?by=<navn>` (map filter). Write the sticker description funny/sarcastic in Danish if the user only gives a start; Emil is the face on the sticker.
- Star ratings 1–5, one per device (random id in localStorage): `server/api/ratings.*` + `server/utils/ratings.ts`. Redis is shared with the stickers (`server/utils/redis.ts`, env vars `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_*`); without them in production the ratings API returns 503 and the stars are hidden. In dev both fall back to Nitro storage in `.data/`.
- Design: v2 (light, glass, soft shadows). The first design (thick black outlines, yellow) is git tag `design-v1` if the user wants to go back.
- Distances are measured from Aalborg (`AALBORG` in `app/utils/stickers.ts`).
- Code lock: `emileric` (`app/composables/useUnlock.ts`), client-side only.
- Icons: `npm run icons` regenerates favicon/PWA icons/marker from `branding/logo.png`.
- `npx nuxi typecheck` must pass.
