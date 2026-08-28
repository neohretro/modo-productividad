/**
 * Sincronización en la nube — lógica pura (fusión de estados). La orquestación
 * (cuándo subir/bajar, reintentos, timers) vive en `src/main/sync.ts`.
 *
 * Modelo: un blob `PersistedState` por usuario en `productividad.sync_state`.
 * Resolución de conflictos = última escritura gana sobre el blob completo, con
 * `rev` (contador del servidor) como árbitro. Solo cuando DOS equipos editan
 * entre sincronizaciones se hace una fusión campo a campo (`mergeStates`).
 *
 * Limitación conocida de v1: sin "tombstones". Si borras una tarea en un equipo
 * y editas en otro sin sincronizar entremedias, la tarea borrada puede
 * reaparecer. En el caso normal (editar un equipo, cerrarlo, abrir el otro) la
 * bajada reemplaza el estado local entero y el borrado sí se propaga.
 */
import type { DailySnapshot, PersistedState, Project, StreakState, Task } from './types'

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'synced' | 'error'

export interface SyncStatus {
  phase: SyncPhase
  /** epoch ms de la última sincronización correcta, o null. */
  lastSyncedAt: number | null
  /** mensaje legible cuando `phase` es 'error'. */
  message?: string
}

/**
 * true si el estado local no tiene nada del usuario (recién instalado / nunca
 * tocado). Sirve para decidir, al entrar por primera vez en un equipo, si la
 * nube reemplaza lo local (equipo limpio) o se fusiona (había trabajo offline).
 */
export function isPristine(s: PersistedState): boolean {
  return (
    s.todayTasks.length === 0 &&
    s.scheduledTasks.length === 0 &&
    s.archivedTasks.length === 0 &&
    s.projects.length === 0 &&
    s.snapshots.length === 0 &&
    s.streak.current === 0 &&
    s.streak.best === 0
  )
}

/** Huella estable del estado sincronizable (para detectar cambios locales sin subir). */
export function stateFingerprint(s: PersistedState): string {
  return JSON.stringify([
    s.todayTasks,
    s.scheduledTasks,
    s.archivedTasks,
    s.projects,
    s.snapshots,
    s.streak,
    s.settings,
    s.lastRolloverDate
  ])
}

function mergeTask(a: Task, b: Task): Task {
  // "Hecha" gana: si una está completada, nos quedamos con esa (y su fecha/tiempo).
  if (a.done !== b.done) return a.done ? a : b
  const base = b.timeSpentMs > a.timeSpentMs ? b : a
  return {
    ...base,
    timeSpentMs: Math.max(a.timeSpentMs, b.timeSpentMs),
    daysRolled: Math.max(a.daysRolled, b.daysRolled),
    remindAt: a.remindAt ?? b.remindAt,
    focusStartedAt: a.focusStartedAt ?? b.focusStartedAt,
    completedDate: a.completedDate ?? b.completedDate
  }
}

function mergeTaskList(a: Task[], b: Task[]): Task[] {
  const byId = new Map<string, Task>()
  for (const t of a) byId.set(t.id, t)
  for (const t of b) {
    const cur = byId.get(t.id)
    byId.set(t.id, cur ? mergeTask(cur, t) : t)
  }
  return [...byId.values()]
}

function mergeProjects(a: Project[], b: Project[]): Project[] {
  const byId = new Map<string, Project>()
  for (const p of a) byId.set(p.id, p)
  for (const p of b) {
    const cur = byId.get(p.id)
    if (!cur) {
      byId.set(p.id, p)
    } else {
      byId.set(p.id, { ...cur, name: cur.name, tasks: mergeTaskList(cur.tasks, p.tasks) })
    }
  }
  return [...byId.values()]
}

function mergeSnapshots(a: DailySnapshot[], b: DailySnapshot[]): DailySnapshot[] {
  const byDate = new Map<string, DailySnapshot>()
  for (const s of [...a, ...b]) {
    const cur = byDate.get(s.date)
    // el que tenga más tareas contabilizadas gana (cierre más completo del día)
    if (!cur || s.totalTasks > cur.totalTasks) byDate.set(s.date, s)
  }
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date))
}

function mergeStreak(a: StreakState, b: StreakState): StreakState {
  const newer =
    (a.lastCountedDate ?? '') >= (b.lastCountedDate ?? '') ? a : b
  return {
    current: Math.max(a.current, b.current),
    best: Math.max(a.best, b.best),
    lastCountedDate: newer.lastCountedDate,
    freezesAvailable: Math.max(a.freezesAvailable, b.freezesAvailable)
  }
}

/**
 * Fusiona dos estados cuando ambos cambiaron desde la última sincronización.
 * `local` es la base (sus ajustes y su versión mandan); de `remote` se traen
 * las tareas/proyectos/snapshots que el equipo local no tenía.
 */
export function mergeStates(local: PersistedState, remote: PersistedState): PersistedState {
  return {
    version: local.version,
    todayTasks: mergeTaskList(local.todayTasks, remote.todayTasks),
    scheduledTasks: mergeTaskList(local.scheduledTasks, remote.scheduledTasks),
    archivedTasks: mergeTaskList(local.archivedTasks, remote.archivedTasks),
    projects: mergeProjects(local.projects, remote.projects),
    snapshots: mergeSnapshots(local.snapshots, remote.snapshots),
    streak: mergeStreak(local.streak, remote.streak),
    settings: local.settings,
    lastRolloverDate:
      (local.lastRolloverDate ?? '') >= (remote.lastRolloverDate ?? '')
        ? local.lastRolloverDate
        : remote.lastRolloverDate
  }
}
