/**
 * Vista de calendario / semana. Qué tareas "caen" en cada día:
 *  - día pasado  → tareas completadas ese día (por completedDate)
 *  - hoy         → toda la lista de "Hoy" (día asignado hoy o anterior)
 *  - día futuro  → tareas con ese día asignado
 */
import type { PersistedState, Task } from './types'
import { addDaysISO, localDayOf, toISODate } from './date'

export interface DayColumn {
  iso: string
  isToday: boolean
  isPast: boolean
  tasks: Task[]
  doneCount: number
}

/** Los 7 días (lunes→domingo) de la semana que contiene `anchorISO`. */
export function weekOf(anchorISO: string): string[] {
  const d = new Date(`${anchorISO}T00:00:00`)
  const dow = (d.getDay() + 6) % 7 // 0 = lunes
  const monday = addDaysISO(anchorISO, -dow)
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
}

function dateOf(iso: string | null): string {
  return iso ? localDayOf(iso) : ''
}

/** Construye las 7 columnas de una semana con sus tareas. */
export function buildWeek(
  state: Pick<PersistedState, 'tasks' | 'archivedTasks'>,
  weekDates: string[],
  now: Date = new Date()
): DayColumn[] {
  const today = toISODate(now)

  return weekDates.map((iso) => {
    const isToday = iso === today
    const isPast = iso < today

    let tasks: Task[]
    if (isToday) {
      tasks = state.tasks.filter((t) => t.scheduledDate !== null && t.scheduledDate <= today)
    } else if (isPast) {
      // completadas ese día, vengan de donde vengan
      tasks = [...state.archivedTasks, ...state.tasks].filter(
        (t) => t.done && dateOf(t.completedDate) === iso
      )
    } else {
      tasks = state.tasks.filter((t) => t.scheduledDate === iso)
    }

    // dedupe por id
    const seen = new Set<string>()
    tasks = tasks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))

    return {
      iso,
      isToday,
      isPast,
      tasks,
      doneCount: tasks.filter((t) => t.done).length
    }
  })
}

/** ¿Se puede agregar una tarea a este día? (no al pasado). */
export function canAddOn(iso: string, now: Date = new Date()): boolean {
  return iso >= toISODate(now)
}

/** Primer día del mes que contiene `anchorISO` y `n` meses después (n puede ser negativo). */
export function shiftMonth(anchorISO: string, n: number): string {
  const [y, m] = anchorISO.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return toISODate(d)
}

export interface MonthCell extends DayColumn {
  /** false para los días de relleno de los meses vecinos. */
  inMonth: boolean
}

/**
 * Cuadrícula del mes (semanas de lunes a domingo, solo las filas necesarias:
 * 4 a 6) con las tareas de cada día.
 */
export function buildMonth(
  state: Pick<PersistedState, 'tasks' | 'archivedTasks'>,
  anchorISO: string,
  now: Date = new Date()
): MonthCell[] {
  const first = shiftMonth(anchorISO, 0)
  const monthKey = first.slice(0, 7)
  const start = weekOf(first)[0]
  const lastDay = addDaysISO(shiftMonth(anchorISO, 1), -1)
  const end = weekOf(lastDay)[6]

  const dates: string[] = []
  for (let d = start; d <= end; d = addDaysISO(d, 1)) dates.push(d)

  return buildWeek(state, dates, now).map((c) => ({ ...c, inMonth: c.iso.startsWith(monthKey) }))
}
