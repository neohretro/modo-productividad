/**
 * Selectores del modelo unificado: UNA lista de tareas (`state.tasks`) y distintas
 * vistas sobre ella. Un proyecto es solo una etiqueta; el día asignado
 * (`scheduledDate`) decide si la tarea está en Hoy, en un día de la Semana o
 * "suelta" (sin día) en "Todas las tareas".
 */
import type { PersistedState, Project, Task } from './types'
import { toISODate } from './date'

type WithTasks = Pick<PersistedState, 'tasks'>

/** Tareas que están en "Hoy": su día asignado es hoy o ya pasó. */
export function todayList(state: WithTasks, now: Date = new Date()): Task[] {
  const today = toISODate(now)
  return state.tasks.filter((t) => t.scheduledDate !== null && t.scheduledDate <= today)
}

/** Tareas con un día futuro asignado (se ven en la Semana y en "Programadas"). */
export function scheduledAhead(state: WithTasks, now: Date = new Date()): Task[] {
  const today = toISODate(now)
  return state.tasks
    .filter((t) => t.scheduledDate !== null && t.scheduledDate > today)
    .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''))
}

/** Tareas pendientes sin día asignado ("sueltas"). */
export function looseTasks(state: WithTasks): Task[] {
  return state.tasks.filter((t) => t.scheduledDate === null && !t.done)
}

export type DayBucket = 'today' | 'future' | 'loose'

export function dayBucket(task: Task, now: Date = new Date()): DayBucket {
  if (task.scheduledDate === null) return 'loose'
  return task.scheduledDate <= toISODate(now) ? 'today' : 'future'
}

/** Todas las tareas con una etiqueta de proyecto: vivas + archivadas (hechas). */
export function projectTasks(
  state: Pick<PersistedState, 'tasks' | 'archivedTasks'>,
  projectId: string
): Task[] {
  return [
    ...state.tasks.filter((t) => t.projectId === projectId),
    ...state.archivedTasks.filter((t) => t.projectId === projectId)
  ]
}

/** Progreso acumulado de un proyecto (nunca se reinicia). */
export function projectProgressOf(
  state: Pick<PersistedState, 'tasks' | 'archivedTasks'>,
  projectId: string
): { done: number; total: number; pct: number } {
  const all = projectTasks(state, projectId)
  const done = all.filter((t) => t.done).length
  return { done, total: all.length, pct: all.length === 0 ? 0 : done / all.length }
}

/** Nombre del proyecto de una tarea, o null si no tiene etiqueta. */
export function projectNameFor(projects: Project[], task: Task): string | null {
  if (task.projectId === null) return null
  return projects.find((p) => p.id === task.projectId)?.name ?? null
}

/** Etiqueta corta y humana del día asignado: "hoy", "mañana", "vie 23", "5 nov". */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const today = toISODate(now)
  if (iso <= today) return 'hoy'
  const t = new Date(`${today}T00:00:00`)
  const d = new Date(`${iso}T00:00:00`)
  const days = Math.round((d.getTime() - t.getTime()) / 86_400_000)
  if (days === 1) return 'mañana'
  if (days <= 6) return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' }).replace('.', '')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
}
