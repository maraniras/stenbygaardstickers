const key = (name: string) => name.normalize('NFC').toLocaleLowerCase('da')

/** Sticker names must not reintroduce a deactivated registered profile. */
export function leaderboardPeople(
  people: { name: string }[],
  users: { name: string; inactive?: boolean }[],
) {
  const hidden = new Set(users.filter((u) => u.inactive).map((u) => key(u.name)))
  const names = new Map<string, { name: string; registered: boolean }>()
  for (const person of people)
    if (!hidden.has(key(person.name)))
      names.set(key(person.name), { name: person.name, registered: false })
  for (const user of users)
    if (!hidden.has(key(user.name)))
      names.set(key(user.name), { name: user.name, registered: true })
  return [...names.values()]
}
