/**
 * Migración entre el modelo VIEJO (listas separadas: todayTasks / scheduledTasks /
 * proyectos con sus propias tareas) y el NUEVO (una sola lista `tasks` donde el
 * proyecto es una etiqueta).
 *
 *  - `migrateLegacyTasks`: del modelo viejo al nuevo (al cargar estados antiguos,
 *    locales o bajados de la nube).
 *  - `toCloudBlob`: el estado que se sube a la nube lleva ADEMÁS un "espejo" en el
 *    formato viejo. Así una versión antigua de la app (aún sin actualizar) que lo
 *    baje sigue viendo sus tareas en vez de un estado vacío, y si lo vuelve a
 *    subir, esta versión lo reconoce y lo migra sin perder nada.
 */
import type { PersistedState, Project, Task } from './types'
import { toISODate } from './date'

/** Forma de un estado guardado por versiones ≤ 4. */
export interface LegacyShape {
  todayTasks?: Partial<Task>[]
  scheduledTasks?: Partial<Task>[]
  archivedTasks?: Partial<Task>[]
  projects?: { id?: string; name?: string; createdDate?: string; tasks?: Partial<Task>[] }[]
}

/** ¿Este estado ya viene en el formato nuevo? */
export function isNewShape(loaded: { version?: number; tasks?: unknown }): boolean {
  return (loaded.version ?? 0) >= 5 && Array.isArray(loaded.tasks)
}

/** Etiqueta válida: el id de un proyecto, o null (el viejo 'today' = sin proyecto). */
export function cleanProjectId(id: unknown): string | null {
  return typeof id === 'string' && id !== '' && id !== 'today' ? id : null
}

/**
 * Convierte las listas del modelo viejo en la lista única. `normalize` rellena los
 * campos que falten de cada tarea.
 */
export function migrateLegacyTasks(
  legacy: LegacyShape,
  normalize: (t: Partial<Task>) => Task,
  now: Date = new Date()
): { tasks: Task[]; archivedTasks: Task[] } {
  const today = toISODate(now)
  const tasks: Task[] = []

  // Lista continua de Hoy: sin proyecto, asignadas a su día de creación (o hoy).
  for (const raw of legacy.todayTasks ?? []) {
    const t = normalize(raw)
    const created = t.createdDate && t.createdDate <= today ? t.createdDate : today
    tasks.push({ ...t, projectId: null, scheduledDate: created })
  }

  // Programadas: sin proyecto, con su día.
  for (const raw of legacy.scheduledTasks ?? []) {
    const t = normalize(raw)
    tasks.push({ ...t, projectId: null, scheduledDate: raw.scheduledDate ?? today })
  }

  // Tareas de proyecto: pasan a ser tareas con etiqueta. Las que se estaban
  // trabajando hoy quedan en Hoy; el resto queda "suelta" hasta que la asignes.
  for (const p of legacy.projects ?? []) {
    if (!p.id) continue
    for (const raw of p.tasks ?? []) {
      const t = normalize(raw)
      const workingToday = !t.done && t.lastFocusedDate === today
      tasks.push({ ...t, projectId: p.id, scheduledDate: workingToday ? today : null })
    }
  }

  const archivedTasks = (legacy.archivedTasks ?? []).map((raw) => {
    const t = normalize(raw)
    return { ...t, projectId: cleanProjectId(raw.projectId) }
  })

  return { tasks, archivedTasks }
}

/**
 * Estado listo para subir a la nube: el formato nuevo + el espejo en el formato
 * viejo (todayTasks / scheduledTasks / projects[].tasks).
 */
export function toCloudBlob(state: PersistedState, now: Date = new Date()): Record<string, unknown> {
  const today = toISODate(now)
  const projectIds = new Set(state.projects.map((p) => p.id))

  const todayTasks: Task[] = []
  const scheduledTasks: Task[] = []
  const byProject = new Map<string, Task[]>()

  for (const t of state.tasks) {
    if (t.projectId !== null && projectIds.has(t.projectId)) {
      const inToday = !t.done && t.scheduledDate !== null && t.scheduledDate <= today
      const list = byProject.get(t.projectId) ?? []
      list.push({
        ...t,
        scheduledDate: null,
        lastFocusedDate: inToday ? today : t.lastFocusedDate
      })
      byProject.set(t.projectId, list)
    } else if (t.scheduledDate !== null && t.scheduledDate <= today) {
      todayTasks.push({ ...t, projectId: 'today', scheduledDate: null })
    } else {
      // futuras y sueltas sin proyecto: el formato viejo las llama "programadas"
      scheduledTasks.push({ ...t, projectId: 'today' })
    }
  }

  const projects = state.projects.map((p: Project) => ({ ...p, tasks: byProject.get(p.id) ?? [] }))
  // `archivedTasks` se queda tal cual (las versiones viejas toleran projectId null).
  return { ...state, todayTasks, scheduledTasks, projects }
}
