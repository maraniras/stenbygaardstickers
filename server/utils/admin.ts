// Admin logger ind med ADMIN_PASSWORD (miljøvariabel på Vercel). Cookien indeholder
// en HMAC af adgangskoden, så den bliver ugyldig, hvis adgangskoden skiftes.
// Under `npm run dev` uden variablen er adgangskoden "admin".
import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'stenbygaard-admin'
const password = process.env.ADMIN_PASSWORD || (import.meta.dev ? 'admin' : '')

const sign = (value: string) =>
  createHmac('sha256', value).update('stenbygaard-admin').digest('hex')

function same(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function checkPassword(input: string) {
  if (!password) throw createError({ statusCode: 503, statusMessage: 'Admin er ikke sat op' })
  return same(sign(input), sign(password))
}

export function setAdminCookie(event: Parameters<typeof setCookie>[0]) {
  setCookie(event, COOKIE, sign(password), {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  })
}

export function clearAdminCookie(event: Parameters<typeof setCookie>[0]) {
  deleteCookie(event, COOKIE, { path: '/' })
}

export function isAdmin(event: Parameters<typeof getCookie>[0]) {
  const value = getCookie(event, COOKIE)
  return Boolean(password && value && same(value, sign(password)))
}

export function requireAdmin(event: Parameters<typeof getCookie>[0]) {
  if (!isAdmin(event)) throw createError({ statusCode: 401, statusMessage: 'Log ind som admin' })
}
