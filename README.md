# Stenbygaard Stickers

Kort og tidslinje over alle Stenbygaard-stickers i verden. Nuxt 4, hostet på Vercel.

```bash
npm install
npm run dev
```

Koden til appen er `emileric`.

## Nye stickers

Alle kan tilføje en sticker med plus-knappen ved siden af opdater-knappen (`/upload`). Den kommer først på kortet, når den er godkendt på `/admin` (link nederst på listen), hvor man også kan rette titel, beskrivelse, navne, placering og medier.

Stickers ligger i Upstash Redis, og uploadede billeder og videoer ligger i Vercel Blob. Vercel-projektet skal have:

| Variabel | Hvad |
| --- | --- |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (stickers og stjerner) |
| `BLOB_STORE_ID` (eller `BLOB_READ_WRITE_TOKEN`) | Vercel Blob (uploads) – kommer automatisk, når en Blob-store forbindes til projektet. Lageret skal være **Public** |
| `ADMIN_PASSWORD` | Adgangskode til `/admin` |

Under `npm run dev` uden variablerne gemmes alt i `.data/`, og admin-adgangskoden er `admin`.

### Med scriptet

```bash
node scripts/add-sticker.mjs --lat 48.8584 --lng 2.2945 --title "Eiffeltårnet" --date 2026-10-22 --by "Emil, Eric" --desc "Tekst" billede.jpg video.mov
```

Scriptet finder by og land ud fra koordinatet, komprimerer billeder og videoer til `public/media/<id>/` og skriver `app/data/stickers/<id>.json`. Commit og push, så deployer Vercel, og filen bliver kopieret ind i databasen. Filerne i `app/data/stickers/` kopieres kun ind én gang – ret derefter i `/admin`.
