/**
 * Modelo de datos — MODO CREADOR - Productividad (ver PLAN.md §4.1).
 * Compartido entre proceso main (persistencia) y renderer (UI).
 */

/**
 * IDs reservados de las VISTAS (no son proyectos): "Hoy" y "Todas las tareas".
 * Se usan en el selector del mini y en la pantalla Proyectos.
 */
export const TODAY_PROJECT_ID = 'today' as const
export const ALL_TASKS_ID = 'all' as const

export interface Task {
  id: string
  text: string
  done: boolean
  /** Etiqueta de proyecto (id), o null si no es de ningún proyecto. */
  projectId: string | null
  /** ISO date (YYYY-MM-DD) en que se creó. */
  createdDate: string
  /** ISO datetime en que se completó, o null. */
  completedDate: string | null
  /**
   * Solo aplica a tareas en "Hoy": cuántos días lleva pendiente sin cerrarse.
   * 0 el día que se crea, +N cada vez que cierran días con la tarea abierta.
   */
  daysRolled: number
  /** Milisegundos acumulados de trabajo (cronómetro del modo enfoque), ya cerrados. */
  timeSpentMs: number
  /** epoch ms del tramo de enfoque activo, o null si la tarea no está en curso. */
  focusStartedAt: number | null
  /**
   * Día asignado (ISO date). null = tarea "suelta" (sin día): vive en "Todas las
   * tareas" hasta que la asignes. Hoy o un día pasado = está en "Hoy"; un día
   * futuro = aparece en ese día de la Semana y se activa sola cuando llega.
   */
  scheduledDate: string | null
  /** ISO datetime del recordatorio (notificación nativa), o null. Se limpia al dispararse. */
  remindAt: string | null
  /** ISO date del último día en que se enfocó ("play"). Informativo. */
  lastFocusedDate: string | null
}

/**
 * Un proyecto es solo una ETIQUETA que se le pone a las tareas. Sus tareas no
 * viven "dentro" del proyecto: son las mismas de Hoy y de la Semana, y el panel
 * Proyectos las junta por etiqueta.
 */
export interface Project {
  id: string
  name: string
  createdDate: string
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

export type ThemePref = 'light' | 'dark' | 'system'

export interface AppSettings {
  launchOnStartup: boolean
  globalShortcut: string
  miniWindowBounds: { x: number; y: number } | null
  /** Avisar cuando hay varias tareas en enfoque a la vez (nudge, no bloqueo). */
  multitaskNudges: boolean
  /** Tema visible: claro, oscuro o el del sistema. */
  theme: ThemePref
}

/** Forma completa del estado persistido en disco (electron-store). */
export interface PersistedState {
  version: number
  /**
   * TODAS las tareas vivas, en una sola lista. Dónde se ven lo decide su día
   * asignado (`scheduledDate`) y su etiqueta (`projectId`):
   *  - día de hoy o anterior → aparece en "Hoy"
   *  - día futuro            → aparece en ese día de la Semana
   *  - sin día               → "suelta", vive en "Todas las tareas"
   */
  tasks: Task[]
  /** Tareas completadas ya archivadas al cerrar su día. Historial y progreso de proyectos. */
  archivedTasks: Task[]
  /** Etiquetas de proyecto. */
  projects: Project[]
  snapshots: DailySnapshot[]
  streak: StreakState
  settings: AppSettings
  /** ISO date del último día que la app "cerró" y procesó. */
  lastRolloverDate: string | null
}

export const DEFAULT_SETTINGS: AppSettings = {
  // Por defecto activos (pedido del usuario): la app arranca con Windows en
  // segundo plano y avisa cuando enfocas varias tareas a la vez.
  launchOnStartup: true,
  globalShortcut: 'CommandOrControl+Shift+M',
  miniWindowBounds: null,
  multitaskNudges: true,
  theme: 'system'
}

export const STATE_VERSION = 5

export const INITIAL_STATE: PersistedState = {
  version: STATE_VERSION,
  tasks: [],
  archivedTasks: [],
  projects: [],
  snapshots: [],
  streak: { current: 0, best: 0, lastCountedDate: null, freezesAvailable: 1 },
  settings: DEFAULT_SETTINGS,
  lastRolloverDate: null
}
