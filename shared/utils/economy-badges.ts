import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import { emptyDailyStats } from './economy'

export function economyBadges(economy?: EconomyPublic): Badge[] {
  const s = economy?.stats ?? emptyDailyStats()
  const make = (
    id: string,
    emoji: string,
    names: string[],
    thresholds: number[],
    value: number,
    about: string,
  ): Badge => {
    const level = thresholds.filter((n) => value >= n).length
    const single = thresholds.length === 1
    const b: Badge = {
      id,
      emoji,
      kind: single ? 'single' : 'tier',
      name: names[Math.max(0, level - 1)]!,
      desc: `${about}: ${thresholds[0]}`,
      about,
      earned: level > 0,
      level,
      levels: thresholds.length,
      value,
      next: thresholds[level],
      nextName: names[level],
      points: 0,
      worth: 0,
      steps: single
        ? undefined
        : thresholds.map((n, i) => ({
            at: n,
            name: names[i]!,
            label: `${n.toLocaleString('da-DK')} · ${about}`,
            reachedAt: economy?.milestones[`${id}:${i + 1}`]?.slice(0, 10),
          })),
      progress: single
        ? { value: Math.min(value, thresholds[0]!), target: thresholds[0]! }
        : undefined,
      earnedAt: economy?.milestones[single ? id : `${id}:${level}`]?.slice(0, 10),
    }
    return b
  }
  return [
    make(
      'banana-baron',
      '🍌',
      ['Et bundt', 'Bananhandler', 'Bananlager', 'Bananbaron', 'Bananimperium'],
      [1000, 5000, 10000, 25000, 50000],
      economy?.peakBalance ?? 0,
      'Højeste banansaldo',
    ),
    make(
      'city-guide',
      '🌍',
      ['Rejseleder', 'Stifinder', 'Bykender', 'Emils rejseleder', 'Verdensguide'],
      [1, 10, 30, 100, 250],
      s.cityWins,
      'Gæt dagens by rigtigt',
    ),
    make(
      'city-gps',
      '📍',
      ['Uden GPS', 'Lokalkendt', 'Menneskelig GPS', 'Indbygget kompas', 'Local Legend'],
      [1, 5, 10, 25, 50],
      s.cityFirstWins,
      'Gæt rigtigt i første forsøg',
    ),
    make(
      'city-streak',
      '🔥',
      ['På rette spor', 'Sporsans', 'Kurs mod Emil', 'Altid på rette spor', 'Aldrig faret vild'],
      [3, 7, 14, 30, 100],
      s.bestCityStreak,
      'Spildøgn i træk med rigtigt bygæt',
    ),
    make(
      'wheel-spins',
      '🎡',
      ['En omgang mere', 'Hjulbenet', 'Rundtosset', 'Drejeskiven', 'Hjulminister'],
      [7, 30, 100, 200, 365],
      s.wheelSpins,
      'Spins i alt',
    ),
    make(
      'wheel-streak',
      '📅',
      ['Fast inventar', 'Daglig gæst', 'Stamspiller', 'En del af hjulet', 'Møder altid op'],
      [3, 7, 14, 30, 100],
      s.bestWheelStreak,
      'Spildøgn i træk med et spin',
    ),
    make(
      'wheel-jackpot',
      '🏆',
      ['Hjulets udvalgte'],
      [1],
      s.wheelJackpots,
      'Ram jackpot på lykkehjulet',
    ),
    make('city-last', '😅', ['I sidste øjeblik'], [1], s.cityLastWins, 'Gæt byen på femte forsøg'),
    make('wheel-nits', '🙃', ['Nitteekspert'], [3], s.bestNitStreak, 'Nitter i tre spins i træk'),
  ]
}
