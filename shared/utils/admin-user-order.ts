/** Active profiles first, with Danish alphabetical order inside each group. */
export function compareAdminUsers(
  a: { name: string; deactivatedAt?: string },
  b: { name: string; deactivatedAt?: string },
) {
  return Number(!!a.deactivatedAt) - Number(!!b.deactivatedAt) || a.name.localeCompare(b.name, 'da')
}
