// Land (ISO alpha-2) → kontinent, til kontinent-badges. Rusland tæller som Europa,
// Tyrkiet som Asien. Antarktis er ikke med.
export type Continent = 'europa' | 'afrika' | 'asien' | 'nordamerika' | 'sydamerika' | 'oceanien'

const LISTS: Record<Continent, string> = {
  europa: 'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  afrika: 'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
  asien: 'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  nordamerika: 'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI',
  sydamerika: 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE',
  oceanien: 'AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS',
}

const BY_CODE = new Map<string, Continent>(
  (Object.entries(LISTS) as [Continent, string][]).flatMap(([c, codes]) => codes.split(' ').map(code => [code, c] as const)),
)

export function continentOf(countryCode: string): Continent | undefined {
  return BY_CODE.get(countryCode.toUpperCase())
}
