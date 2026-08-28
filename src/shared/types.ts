/**
 * Modelo de datos — MODO CREADOR - Productividad (ver PLAN.md §4.1).
 * Compartido entre proceso main (persistencia) y renderer (UI).
 */

/** ID del proyecto reservado para la lista continua "Hoy". */
export const TODAY_PROJECT_ID = 'today' as const

export interface Task {
  id: string
  text: string
  done: boolean
  /** `TODAY_PROJECT_ID` para la lista de Hoy, o el id de un proyecto. */
  projectId: string
  /** ISO date (YYYY-MM-DD) en que se creó. */
  createdDate: string
  /** ISO datetime en que se completó, o null. */
  completedDate: string | null
  /**
   * Solo aplica a tareas de "Hoy": cuántos días lleva pendiente sin cerrarse.
   * 0 el día que se crea, +N cada vez que cierran días con la tarea abierta.
   */
  daysRolled: number
}

export interface Project {
  id: string
  name: string
  createdDate: string
  /** progreso = completadas / total, acumulado, nunca se resetea solo. */
  tasks: Task[]
}

/** Foto del estado de un día que cerró. Alimenta el Resumen (PLAN.md §4.2). */
export interface DailySnapshot {
  /** ISO date (YYYY-MM-DD) del día que cerró. */
  date: string
  totalTasks: number
  completedTasks: number
  /** 0..1 */
  completionRate: number
  /** cuántas tareas pendientes pasaron al día siguiente. */
  tasksCarriedOver: number
}

export interface StreakState {
  /** días consecutivos con cierre completo. */
  current: number
  /** mejor racha histórica. */
  best: number
  /** ISO date del último día contabilizado para la racha. */
  lastCountedDate: string | null
  /** "protectores de racha" disponibles (toque videojuego, PLAN.md §9). */
  freezesAvailable: number
}

export interface AppSettings {
  launchOnStartup: boolean
  globalShortcut: string
  miniWindowBounds: { x: number; y: number } | null
}

/** Forma completa del estado persistido en disco (electron-store). */
export interface PersistedState {
  version: number
  /** Lista continua de "Hoy" (pendientes + completadas del día en curso). */
  todayTasks: Task[]
  /** Tareas de "Hoy" ya archivadas al cerrar su día. Historial para el Resumen. */
  archivedTasks: Task[]
  projects: Project[]
  snapshots: DailySnapshot[]
  streak: StreakState
  settings: AppSettings
  /** ISO date del último día que la app "cerró" y procesó. */
  lastRolloverDate: string | null
}

export const DEFAULT_SETTINGS: AppSettings = {
  launchOnStartup: false,
  globalShortcut: 'CommandOrControl+Shift+M',
  miniWindowBounds: null
}

export const INITIAL_STATE: PersistedState = {
  version: 1,
  todayTasks: [],
  archivedTasks: [],
  projects: [],
  snapshots: [],
  streak: { current: 0, best: 0, lastCountedDate: null, freezesAvailable: 1 },
  settings: DEFAULT_SETTINGS,
  lastRolloverDate: null
}
