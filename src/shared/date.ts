/** Utilidades de fecha en hora local. ISO date = 'YYYY-MM-DD'. */

export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Días de calendario entre dos ISO dates (toISO - fromISO). Negativo si el reloj retrocede. */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime()
  const b = new Date(`${toISO}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** 'lun', 'mar', … a partir de un ISO date. */
export function weekdayShortES(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString('es', { weekday: 'short' })
    .replace('.', '')
}
