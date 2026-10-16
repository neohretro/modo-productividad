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

/**
 * Día LOCAL (YYYY-MM-DD) de una fecha ISO. Las fechas con hora se guardan en UTC
 * (`toISOString`): cortar el texto daba el día equivocado después de las 7 pm en
 * Colombia. Aquí se convierten a la hora local antes de tomar el día.
 */
export function localDayOf(iso: string): string {
  if (iso.length <= 10) return iso
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : toISODate(d)
}
