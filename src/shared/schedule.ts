/**
 * Etiquetas de fechas programadas. (Las tareas con día asignado entran solas a
 * "Hoy" cuando llega su día: ya no hay que "activarlas".)
 */
import type { Task } from './types'
import { toISODate } from './date'

/** Etiqueta corta y humana para una fecha programada. */
export function scheduleLabel(iso: string, now: Date = new Date()): string {
  const today = toISODate(now)
  const t = new Date(`${today}T00:00:00`)
  const tomorrow = toISODate(new Date(t.getTime() + 86_400_000))
  if (iso === tomorrow) return 'mañana'
  const d = new Date(`${iso}T00:00:00`)
  const days = Math.round((d.getTime() - t.getTime()) / 86_400_000)
  if (days > 1 && days <= 7) {
    return d.toLocaleDateString('es', { weekday: 'long' })
  }
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function isScheduled(task: Task, now: Date = new Date()): boolean {
  return task.scheduledDate !== null && task.scheduledDate > toISODate(now)
}
