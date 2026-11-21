import type { NotifyType } from '../../shared/utils/notify'

export interface SeasonalPushJob {
  id: string
  at: string
  audience: 'all' | 'not-joined' | 'joined'
  type: NotifyType
  title: string
  body: string
  url: string
}

/** Winter dates: Europe/Copenhagen is UTC+1. Copy and dates approved by the user. */
export const SEASONAL_PUSH_JOBS: SeasonalPushJob[] = [
  {
    id: 'christmas-start-2026',
    at: '2026-11-20T05:30:00.000Z',
    audience: 'all',
    type: 'christmas',
    title: 'Nu begynder julen så småt i Stenbygaardland',
    body: 'Prøv dagens bokse og tilmeld dig pakkelegen.',
    url: '/spil/jul',
  },
  {
    id: 'parcel-reminder-2026',
    at: '2026-11-21T07:00:00.000Z',
    audience: 'not-joined',
    type: 'parcels',
    title: 'Husk at tilmelde dig pakkelegen',
    body: 'Tilmeld dig inden den 27. november.',
    url: '/spil/pakkeleg',
  },
  {
    id: 'parcel-last-chance-2026',
    at: '2026-11-26T07:00:00.000Z',
    audience: 'not-joined',
    type: 'parcels',
    title: 'Sidste chance for at tilmelde sig pakkelegen i dag',
    body: 'Husk at tilmelde dig, hvis du vil være med.',
    url: '/spil/pakkeleg',
  },
  {
    id: 'parcel-start-2026',
    at: '2026-11-27T05:30:00.000Z',
    audience: 'joined',
    type: 'parcels',
    title: 'Så er det tid til pakkeleg',
    body: 'Se om du kan få indsamlet nogle gaver.',
    url: '/spil/pakkeleg',
  },
  {
    id: 'advent-start-2026',
    at: '2026-12-01T05:30:00.000Z',
    audience: 'all',
    type: 'christmas',
    title: 'Så har julen for alvor ramt Stenbygaardland',
    body: 'Åbn første låge i julekalenderen nu.',
    url: '/spil/julekalender',
  },
  {
    id: 'new-year-gift-2027',
    at: '2027-01-01T11:00:00.000Z',
    audience: 'all',
    type: 'gifts',
    title: 'Start året med en gave 🎁',
    body: 'Godt nytår! Åbn appen i dag og få 500 bananer. Gaven kan hentes hele den 1. januar.',
    url: '/spil/bananer',
  },
]
