/**
 * Tareas programadas para una fecha futura (clic derecho → "para mañana / otra
 * fecha"). Viven en `scheduledTasks` y se activan a "Hoy" cuando llega el día.
 */
import type { PersistedState, Task } from './types'
import { toISODate } from './date'

/** Mueve a "Hoy" las tareas programadas cuyo día ya llegó. Idempotente. */
export function activateDue(state: PersistedState, now: Date = new Date()): PersistedState {
  const today = toISODate(now)
  const due = state.scheduledTasks.filter((t) => !t.scheduledDate || t.scheduledDate <= today)
  if (due.length === 0) return state

  return {
    ...state,
    todayTasks: [...state.todayTasks, ...due.map((t) => ({ ...t, scheduledDate: null }))],
    scheduledTasks: state.scheduledTasks.filter(
      (t) => t.scheduledDate !== null && t.scheduledDate > today
    )
  }
}

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
