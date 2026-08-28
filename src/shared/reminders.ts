/**
 * Recordatorios — notificaciones nativas a la hora que el usuario elija.
 * La lógica de agendar los `setTimeout` y disparar la notificación vive en
 * `src/main/reminders.ts`; aquí sólo el cálculo puro (testeable).
 */
import type { PersistedState, Task } from './types'

export interface PendingReminder {
  id: string
  text: string
  /** epoch ms en que debe sonar. */
  at: number
  /** el valor ISO original, para revalidar antes de disparar. */
  iso: string
}

/** Cuánto tiempo después de su hora un recordatorio vencido todavía se muestra
 *  (p. ej. sonó mientras la app estaba cerrada). Pasado esto, se descarta. */
export const REMINDER_GRACE_MS = 24 * 60 * 60 * 1000

/** Todas las tareas vivas que pueden tener recordatorio (Hoy + proyectos). */
export function remindableTasks(state: PersistedState): Task[] {
  return [...state.todayTasks, ...state.projects.flatMap((p) => p.tasks)]
}

function toReminder(t: Task): PendingReminder | null {
  if (!t.remindAt || t.done) return null
  const at = new Date(t.remindAt).getTime()
  if (Number.isNaN(at)) return null
  return { id: t.id, text: t.text, at, iso: t.remindAt }
}

/**
 * Divide los recordatorios pendientes en:
 *  - `due`: ya pasó su hora (dentro del margen de gracia) → mostrar ahora
 *  - `upcoming`: aún en el futuro → agendar
 * Los vencidos hace más de `graceMs` se ignoran (ni se muestran ni se agendan).
 */
export function collectReminders(
  state: PersistedState,
  now: number = Date.now(),
  graceMs: number = REMINDER_GRACE_MS
): { due: PendingReminder[]; upcoming: PendingReminder[] } {
  const due: PendingReminder[] = []
  const upcoming: PendingReminder[] = []

  for (const t of remindableTasks(state)) {
    const r = toReminder(t)
    if (!r) continue
    if (r.at > now) upcoming.push(r)
    else if (now - r.at <= graceMs) due.push(r)
  }

  upcoming.sort((a, b) => a.at - b.at)
  return { due, upcoming }
}

// --- presets de hora (devuelven ISO datetime en UTC) ---

export function inHoursISO(h: number, from: Date = new Date()): string {
  return new Date(from.getTime() + h * 3_600_000).toISOString()
}

/** Hoy a las `hour`:00 — o null si esa hora ya pasó. */
export function laterTodayISO(hour: number, from: Date = new Date()): string | null {
  const d = new Date(from)
  d.setHours(hour, 0, 0, 0)
  return d.getTime() > from.getTime() ? d.toISOString() : null
}

export function tomorrowAtISO(hour: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/** Devuelve una copia del estado con `remindAt = null` en las tareas indicadas. */
export function clearRemindAts(state: PersistedState, ids: Set<string>): PersistedState {
  const strip = (t: Task): Task => (ids.has(t.id) ? { ...t, remindAt: null } : t)
  return {
    ...state,
    todayTasks: state.todayTasks.map(strip),
    scheduledTasks: state.scheduledTasks.map(strip),
    projects: state.projects.map((p) => ({ ...p, tasks: p.tasks.map(strip) }))
  }
}
