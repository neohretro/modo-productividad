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
import { toISODate } from './date'

/** Si un tramo de enfoque quedó abierto más de esto (app cerrada), se descarta. */
export const STALE_FOCUS_MS = 4 * 60 * 60 * 1000

/** Tiempo total de una tarea = acumulado + tramo activo. */
export function elapsedMs(task: Task, now: number = Date.now()): number {
  const live = task.focusStartedAt === null ? 0 : Math.max(0, now - task.focusStartedAt)
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

/** Legible para humanos: "45 s", "23 min", "1 h 5 min". Sin segundos que estresen. */
export function formatDurationLong(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec} s`
  const totalMin = Math.round(totalSec / 60)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Cierra un tramo de enfoque sumando el tiempo transcurrido (con tope anti-basura). */
export function commitFocus(task: Task, now: number = Date.now()): Task {
  if (task.focusStartedAt === null) return task
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
    focusStartedAt: t.focusStartedAt ?? null,
    scheduledDate: t.scheduledDate ?? null,
    remindAt: t.remindAt ?? null,
    lastFocusedDate: t.lastFocusedDate ?? null
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
    if (t.focusStartedAt === null) return t
    const open = now - t.focusStartedAt
    if (open >= STALE_FOCUS_MS) return { ...t, focusStartedAt: null }
    return t
  }

  return {
    version: STATE_VERSION,
    todayTasks: (loaded.todayTasks ?? []).map((t) => closeStale(normalizeTask(t))),
    scheduledTasks: (loaded.scheduledTasks ?? []).map(normalizeTask),
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

/** Estado de enfoque de una tarea, para diferenciarlas visualmente. */
export type FocusPhase = 'idle' | 'running' | 'paused'

export function focusPhase(task: Task): FocusPhase {
  if (task.focusStartedAt !== null) return 'running'
  if (!task.done && task.timeSpentMs >= 1000) return 'paused'
  return 'idle'
}

/**
 * Orden en la lista: primero lo que está en curso, luego lo pausado, luego lo
 * que no has empezado, y al final lo hecho. Estable dentro de cada grupo.
 */
export function focusSortRank(task: Task): number {
  if (task.done) return 3
  const p = focusPhase(task)
  return p === 'running' ? 0 : p === 'paused' ? 1 : 2
}

/**
 * Tareas DE PROYECTO que estás trabajando hoy (les diste "play" en algún momento
 * del día). Se muestran también en "Hoy", con su etiqueta de proyecto, todo el
 * día, aunque las pauses, hasta cerrarlas o hasta que cambie el día. Así lo que
 * estás haciendo hoy vive en un solo lugar.
 */
export function todayProjectTasks(
  state: Pick<PersistedState, 'projects'>,
  now: Date = new Date()
): Task[] {
  const today = toISODate(now)
  return state.projects
    .flatMap((p) => p.tasks)
    .filter((t) => !t.done && t.lastFocusedDate === today)
}
