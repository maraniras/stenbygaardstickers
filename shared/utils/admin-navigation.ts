/** Admin's Christmas tools remain visible through the delivery period. */
export function adminChristmasVisible(now = new Date()) {
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Copenhagen' }).format(now)
  const monthDay = day.slice(5)
  return monthDay >= '11-01' || monthDay <= '01-15'
}
