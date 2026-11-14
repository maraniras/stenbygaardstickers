// Typer af notifikationer man kan slå til og fra (gemt på brugeren, standard: til).
// "stickers", "updates" og "crossword" virker også uden login – de andre kræver et navn.
export type NotifyType =
  | 'stickers'
  | 'updates'
  | 'badges'
  | 'levels'
  | 'records'
  | 'tags'
  | 'replies'
  | 'comments'
  | 'likes'
  | 'gifts'
  | 'parcels'
  | 'crossword'

export const NOTIFY_TYPES: { type: NotifyType; emoji: string; label: string; desc: string }[] = [
  {
    type: 'crossword',
    emoji: '🧩',
    label: 'Kryds & tværs',
    desc: 'En time før et krydsord åbner, og når du kan begynde at spille',
  },
  {
    type: 'parcels',
    emoji: '🎲',
    label: 'Pakkeleg',
    desc: 'Når nogen stjæler din pakke, og når dine præmier er klar',
  },
  { type: 'gifts', emoji: '🎁', label: 'Gaver', desc: 'Når en anden bruger giver dig julebananer' },
  { type: 'stickers', emoji: '📍', label: 'Nye stickers', desc: 'Når Emil lander et nyt sted' },
  {
    type: 'updates',
    emoji: '🆕',
    label: 'Appopdateringer',
    desc: 'Når en ny version af appen udgives',
  },
  {
    type: 'badges',
    emoji: '🏅',
    label: 'Nye badges',
    desc: 'Når du får en badge eller et nyt trin',
  },
  { type: 'levels', emoji: '⬆️', label: 'Level op', desc: 'Når du når et nyt level' },
  {
    type: 'records',
    emoji: '🏆',
    label: 'Rekorder',
    desc: 'Når du får en rekord – eller nogen tager din',
  },
  { type: 'tags', emoji: '🏷️', label: 'Tags', desc: 'Når nogen tagger dig i en kommentar' },
  { type: 'replies', emoji: '↩️', label: 'Svar', desc: 'Når nogen svarer på din kommentar' },
  {
    type: 'comments',
    emoji: '💬',
    label: 'Kommentarer på dine stickers',
    desc: 'Når nogen kommenterer en sticker, du har sat op',
  },
  {
    type: 'likes',
    emoji: '👍',
    label: '👍 på dine kommentarer',
    desc: 'Højst én gang i timen pr. kommentar',
  },
]

export type NotifyPrefs = Partial<Record<NotifyType, boolean>>

export const isNotifyType = (t: unknown): t is NotifyType => NOTIFY_TYPES.some((n) => n.type === t)

/** Standard er til */
export const wants = (prefs: NotifyPrefs | undefined, type: NotifyType) => prefs?.[type] !== false
