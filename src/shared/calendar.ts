/**
 * Vista de calendario / semana. Qué tareas "caen" en cada día:
 *  - día pasado  → tareas completadas ese día (por completedDate)
 *  - hoy         → toda la lista continua de "Hoy" + programadas que ya vencieron
 *  - día futuro  → tareas programadas para ese día (scheduledTasks)
 */
import { TODAY_PROJECT_ID, type PersistedState, type Task } from './types'
import { addDaysISO, toISODate } from './date'

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
  return iso ? iso.slice(0, 10) : ''
}

/** Construye las 7 columnas de una semana con sus tareas. */
export function buildWeek(state: PersistedState, weekDates: string[], now: Date = new Date()): DayColumn[] {
  const today = toISODate(now)
  const projectTasks = state.projects.flatMap((p) => p.tasks)

  return weekDates.map((iso) => {
    const isToday = iso === today
    const isPast = iso < today

    let tasks: Task[]
    if (isToday) {
      tasks = [...state.todayTasks]
    } else if (isPast) {
      // completadas ese día, vengan de donde vengan
      tasks = [
        ...state.archivedTasks,
        ...state.todayTasks,
        ...projectTasks
      ].filter((t) => t.done && dateOf(t.completedDate) === iso)
    } else {
      tasks = state.scheduledTasks.filter((t) => t.scheduledDate === iso)
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

/** El proyecto/lista al que iría una tarea nueva creada en la vista de semana. */
export function targetForDay(iso: string, now: Date = new Date()): { projectId: string; date: string | null } {
  const today = toISODate(now)
  if (iso <= today) return { projectId: TODAY_PROJECT_ID, date: null }
  return { projectId: TODAY_PROJECT_ID, date: iso }
}
