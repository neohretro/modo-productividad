/**
 * Modo enfoque — cronómetro por tarea y aviso de multitasking (PLAN.md §4.3).
 *
 * El tramo activo se guarda como `focusStartedAt` (epoch ms), no como contador
 * corriendo: así todas las ventanas calculan el mismo tiempo y sobrevive a un
 * cierre de la app.
 */
import {
  DEFAULT_SETTINGS,
  STATE_VERSION,
  type PersistedState,
  type Task
} from './types'

/** Si un tramo de enfoque quedó abierto más de esto (app cerrada), se descarta. */
export const STALE_FOCUS_MS = 4 * 60 * 60 * 1000

/** Tiempo total de una tarea = acumulado + tramo activo. */
export function elapsedMs(task: Task, now: number = Date.now()): number {
  const live = task.focusStartedAt ? Math.max(0, now - task.focusStartedAt) : 0
  return task.timeSpentMs + live
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Cierra un tramo de enfoque sumando el tiempo transcurrido (con tope anti-basura). */
export function commitFocus(task: Task, now: number = Date.now()): Task {
  if (!task.focusStartedAt) return task
  const delta = now - task.focusStartedAt
  const add = delta > 0 && delta < STALE_FOCUS_MS ? delta : 0
  return { ...task, timeSpentMs: task.timeSpentMs + add, focusStartedAt: null }
}

function normalizeTask(t: Partial<Task>): Task {
  return {
    id: t.id ?? crypto.randomUUID(),
    text: t.text ?? '',
    done: t.done ?? false,
    projectId: t.projectId ?? 'today',
    createdDate: t.createdDate ?? new Date().toISOString().slice(0, 10),
    completedDate: t.completedDate ?? null,
    daysRolled: t.daysRolled ?? 0,
    timeSpentMs: t.timeSpentMs ?? 0,
    focusStartedAt: t.focusStartedAt ?? null
  }
}

/**
 * Rellena campos nuevos en estados guardados por versiones anteriores y cierra
 * tramos de enfoque que quedaron colgados. Idempotente.
 */
export function normalizeState(
  loaded: Partial<PersistedState>,
  now: number = Date.now()
): PersistedState {
  const closeStale = (t: Task): Task => {
    if (!t.focusStartedAt) return t
    const open = now - t.focusStartedAt
    if (open >= STALE_FOCUS_MS) return { ...t, focusStartedAt: null }
    return t
  }

  return {
    version: STATE_VERSION,
    todayTasks: (loaded.todayTasks ?? []).map((t) => closeStale(normalizeTask(t))),
    archivedTasks: (loaded.archivedTasks ?? []).map(normalizeTask),
    projects: (loaded.projects ?? []).map((p) => ({
      id: p.id ?? crypto.randomUUID(),
      name: p.name ?? 'Proyecto',
      createdDate: p.createdDate ?? new Date().toISOString().slice(0, 10),
      tasks: (p.tasks ?? []).map((t) => closeStale(normalizeTask(t)))
    })),
    snapshots: loaded.snapshots ?? [],
    streak: loaded.streak ?? {
      current: 0,
      best: 0,
      lastCountedDate: null,
      freezesAvailable: 1
    },
    settings: { ...DEFAULT_SETTINGS, ...(loaded.settings ?? {}) },
    lastRolloverDate: loaded.lastRolloverDate ?? null
  }
}

/** IDs de todas las tareas vivas que están en enfoque ahora mismo. */
export function activeFocusTasks(state: PersistedState): Task[] {
  const all = [...state.todayTasks, ...state.projects.flatMap((p) => p.tasks)]
  return all.filter((t) => t.focusStartedAt !== null && !t.done)
}
