// Tom indtil de rigtige spil leverer brugerens tilgængelighed fra serveren.
// Åbning af /spil er ikke det samme som at have spillet. Status skal genhentes
// efter spil, ved bruger-/enhedsskift og ved det danske spildøgns skift kl. 04.
export function useDailyAvailability() {
  const availability = useState<{ city: boolean; wheel: boolean } | null>(
    'daily-game-availability',
    () => null,
  )
  const readyCount = computed(() =>
    availability.value ? Number(availability.value.city) + Number(availability.value.wheel) : 0,
  )
  return { availability, readyCount }
}
