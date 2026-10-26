// Typer af notifikationer man kan slå til og fra (gemt på brugeren, standard: til).
// "stickers" virker også uden login – de andre kræver et navn.
export type NotifyType = 'stickers' | 'badges' | 'levels' | 'records' | 'tags' | 'replies' | 'comments' | 'likes'

export const NOTIFY_TYPES: { type: NotifyType, emoji: string, label: string, desc: string }[] = [
  { type: 'stickers', emoji: '📍', label: 'Nye stickers', desc: 'Når Emil lander et nyt sted' },
  { type: 'badges', emoji: '🏅', label: 'Nye badges', desc: 'Når du får en badge eller et nyt trin' },
  { type: 'levels', emoji: '⬆️', label: 'Level op', desc: 'Når du når et nyt level' },
  { type: 'records', emoji: '🏆', label: 'Rekorder', desc: 'Når du får en rekord – eller nogen tager din' },
  { type: 'tags', emoji: '🏷️', label: 'Tags', desc: 'Når nogen tagger dig i en kommentar' },
  { type: 'replies', emoji: '↩️', label: 'Svar', desc: 'Når nogen svarer på din kommentar' },
  { type: 'comments', emoji: '💬', label: 'Kommentarer på dine stickers', desc: 'Når nogen kommenterer en sticker, du har sat op' },
  { type: 'likes', emoji: '👍', label: '👍 på dine kommentarer', desc: 'Højst én gang i timen pr. kommentar' },
]

export type NotifyPrefs = Partial<Record<NotifyType, boolean>>

export const isNotifyType = (t: unknown): t is NotifyType => NOTIFY_TYPES.some(n => n.type === t)

/** Standard er til */
export const wants = (prefs: NotifyPrefs | undefined, type: NotifyType) => prefs?.[type] !== false
