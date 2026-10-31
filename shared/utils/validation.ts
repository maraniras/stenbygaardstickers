export function normalizeName(input: unknown) {
  return typeof input === 'string' ? input.trim().replace(/\s+/g, ' ').normalize('NFC') : ''
}

export function validName(name: string) {
  return /^\p{L}[\p{L}\p{M} '.-]{0,29}$/u.test(name)
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validCoordinate(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maximum
}
