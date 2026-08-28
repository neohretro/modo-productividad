/**
 * Cierre de día y racha — lógica pura y testeable (PLAN.md §4.1 y §8).
 *
 * Reglas:
 *  - "Hoy" NO se vacía. Al cambiar de día: se toma un DailySnapshot del día que
 *    terminó, las completadas se archivan y las pendientes se quedan con daysRolled += días.
 *  - Los PROYECTOS nunca entran aquí: su progreso es acumulado y solo cambia por
 *    acción directa del usuario.
 *  - Racha estilo videojuego: se rompe si un día con tareas no se cierra al 100%,
 *    pero un "protector de racha" (freeze) cubre un día fallado sin perderla.
 */
import type { DailySnapshot, PersistedState, StreakState, Task } from './types'
import { addDaysISO, daysBetween, toISODate } from './date'
import { commitFocus } from './focus'

/** Freezes máximos acumulables. */
export const FREEZE_CAP = 3
/** Días seguidos para ganar un freeze. */
export const DAYS_PER_FREEZE = 5

export function rolloverIfNeeded(state: PersistedState, now: Date = new Date()): PersistedState {
  const today = toISODate(now)

  // Primera ejecución: no hay día previo que cerrar.
  if (state.lastRolloverDate === null) {
    return { ...state, lastRolloverDate: today }
  }

  const elapsed = daysBetween(state.lastRolloverDate, today)
  if (elapsed <= 0) return state // mismo día, o reloj hacia atrás: no-op

  const closingDate = state.lastRolloverDate
  const completed = state.todayTasks.filter((t) => t.done)
  const pending = state.todayTasks.filter((t) => !t.done)
  const total = state.todayTasks.length

  const closingSnapshot: DailySnapshot = {
    date: closingDate,
    totalTasks: total,
    completedTasks: completed.length,
    completionRate: total === 0 ? 0 : completed.length / total,
    tasksCarriedOver: pending.length
  }

  // Snapshots vacíos para los días que la app estuvo cerrada (cuentan como perdidos).
  const gapSnapshots: DailySnapshot[] = []
  for (let i = 1; i < elapsed; i++) {
    gapSnapshots.push({
      date: addDaysISO(closingDate, i),
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      tasksCarriedOver: pending.length
    })
  }

  // al cerrar el día se corta cualquier enfoque abierto de las tareas que ruedan
  const rolled: Task[] = pending.map((t) => ({
    ...commitFocus(t, now.getTime()),
    daysRolled: t.daysRolled + elapsed
  }))

  return {
    ...state,
    todayTasks: rolled,
    archivedTasks: [
      ...state.archivedTasks,
      ...completed.map((t) => commitFocus(t, now.getTime()))
    ],
    snapshots: [...state.snapshots, closingSnapshot, ...gapSnapshots],
    streak: evaluateStreak(state.streak, closingSnapshot, elapsed),
    lastRolloverDate: today
  }
}

function evaluateStreak(
  prev: StreakState,
  snap: DailySnapshot,
  elapsed: number
): StreakState {
  const dayWon = snap.totalTasks > 0 && snap.completedTasks === snap.totalTasks

  // Hueco de varios días => días perdidos en el medio => la racha se corta.
  if (elapsed > 1) {
    return {
      ...prev,
      current: dayWon ? 1 : 0,
      lastCountedDate: dayWon ? snap.date : prev.lastCountedDate
    }
  }

  if (dayWon) {
    const current = prev.current + 1
    const earnedFreeze =
      current % DAYS_PER_FREEZE === 0 && prev.freezesAvailable < FREEZE_CAP
    return {
      current,
      best: Math.max(prev.best, current),
      lastCountedDate: snap.date,
      freezesAvailable: prev.freezesAvailable + (earnedFreeze ? 1 : 0)
    }
  }

  // Día fallado teniendo tareas => intentar protegerlo con un freeze.
  if (snap.totalTasks > 0 && prev.current > 0 && prev.freezesAvailable > 0) {
    return {
      ...prev,
      freezesAvailable: prev.freezesAvailable - 1,
      lastCountedDate: snap.date
    }
  }

  // Día vacío, o fallado sin freeze disponible => se rompe.
  return { ...prev, current: 0 }
}
