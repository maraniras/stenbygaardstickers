// Build-time input, never fetched by visitors. GeoNames CC BY 4.0; see data notice.
import fs from 'node:fs'
const capitals = Object.fromEntries([...fs.readFileSync('shared/utils/capitals.ts', 'utf8').matchAll(/\b([A-Z]{2}): \[(-?[\d.]+), (-?[\d.]+)\]/g)].map(m => [m[1], [+m[2], +m[3]]]))
const names = { DK: 'København', NO: 'Oslo', SE: 'Stockholm', FI: 'Helsinki', IS: 'Reykjavík', DE: 'Berlin', AT: 'Wien', BE: 'Bruxelles', CH: 'Bern', CZ: 'Prag', GR: 'Athen', IT: 'Rom', PL: 'Warszawa', RU: 'Moskva', RS: 'Beograd', RO: 'Bukarest', PT: 'Lissabon', UA: 'Kyiv', HU: 'Budapest', GB: 'London', FR: 'Paris', ES: 'Madrid', NL: 'Amsterdam', EE: 'Tallinn', LV: 'Riga', LT: 'Vilnius', LU: 'Luxembourg', GL: 'Nuuk', FO: 'Tórshavn', CN: 'Beijing', JP: 'Tokyo', EG: 'Kairo', IN: 'New Delhi', BR: 'Brasília', AU: 'Canberra', US: 'Washington, D.C.' }
// Omit locations with mismatched/multiple/transitioning capital definitions.
const omit = new Set(['ID', 'IL', 'PS', 'ZA', 'LK', 'MY', 'BO', 'HK', 'VA'])
const seen = new Set()
const cities = fs.readFileSync('server/data/countryInfo-source.txt', 'utf8').split(/\r?\n/).filter(l => /^[A-Z]{2}\t/.test(l)).flatMap(line => {
  const f = line.split('\t'), code = f[0], name = names[code] ?? f[5]
  if (!capitals[code] || !name || omit.has(code) || seen.has(name.toLowerCase())) return []
  seen.add(name.toLowerCase())
  return [{ id: code, name, lat: capitals[code][0], lng: capitals[code][1], continent: f[8] }]
}).sort((a, b) => a.continent.localeCompare(b.continent) || a.lng - b.lng)
if (cities.length < 126) throw new Error('Mindst 126 byer kræves til 20 dages pause')
fs.writeFileSync('server/data/daily-cities.json', JSON.stringify(cities, null, 2)+'\n')
console.log(cities.length, 'byer;', Math.floor(cities.length/6), 'daglige grupper')
