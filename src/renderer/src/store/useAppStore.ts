import { create } from 'zustand'
import {
  ALL_TASKS_ID,
  INITIAL_STATE,
  TODAY_PROJECT_ID,
  type PersistedState,
  type Project,
  type Task,
  type ThemePref
} from '@shared/types'
import { toISODate } from '@shared/date'
import { rolloverIfNeeded } from '@shared/rollover'
import { activeFocusTasks, commitFocus, normalizeState } from '@shared/focus'
import { projectNameFor, projectTasks, todayList } from '@shared/tasks'
import { computeGame, rewardBetween, type Reward } from '@shared/game'

type Screen = 'today' | 'week' | 'projects' | 'summary' | 'settings'

/** Aviso efímero al completar una tarea con tiempo registrado. */
export interface CompletionReveal {
  id: string
  text: string
  ms: number
  at: number
}

interface AppState extends PersistedState {
  hydrated: boolean
  screen: Screen
  /** proyecto abierto en Proyectos: ALL_TASKS_ID = ninguno (se ve la lista de proyectos). */
  activeProjectId: string
  /** vista del mini: TODAY_PROJECT_ID (Hoy), ALL_TASKS_ID o el id de un proyecto. */
  miniTargetId: string
  /** última tarea completada con tiempo — la muestra el toast, luego se limpia. */
  recentCompletion: CompletionReveal | null
  /** mensaje efímero ("copiado", "movida a mañana"…). */
  flash: string | null
  /** tarea en modo edición inline (doble clic o menú "Editar"). */
  editingTaskId: string | null
  /** recompensa por la última tarea cerrada (XP, nivel, logros); la muestra el toast. */
  reward: Reward | null

  hydrate: () => Promise<void>
  /** Aplica un estado llegado de otra ventana sin re-guardarlo. */
  applyRemote: (state: PersistedState) => void
  setScreen: (s: Screen) => void
  setActiveProject: (id: string) => void
  setMiniTarget: (id: string) => void
  clearRecentCompletion: () => void
  clearReward: () => void
  setCelebrations: (on: boolean) => void
  setFlash: (msg: string) => void
  checkRollover: () => void

  /**
   * Crea una tarea. `projectId` = etiqueta de proyecto (null = sin proyecto).
   * `date` = día asignado: null = suelta (sin día), hoy o pasado = Hoy, futuro = ese día.
   */
  addTask: (text: string, opts?: { projectId?: string | null; date?: string | null }) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  editTask: (id: string, text: string) => void
  setEditingTask: (id: string | null) => void
  duplicateTask: (id: string) => void
  /** Pone (o quita, con null) el recordatorio de una tarea. ISO datetime. */
  setReminder: (id: string, remindAt: string | null) => void
  /** Asigna la tarea a un día (hoy o pasado = Hoy) o la deja suelta (null). */
  assignDay: (id: string, dateISO: string | null) => void
  /** Cambia la etiqueta de proyecto de la tarea (null = sin proyecto). */
  setTaskProject: (id: string, projectId: string | null) => void

  addProject: (name: string) => string
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void

  /** Inicia el cronómetro de enfoque de una tarea (y la pasa a Hoy). */
  startFocus: (id: string) => void
  /** Detiene el cronómetro y suma el tiempo del tramo. */
  stopFocus: (id: string) => void
  toggleFocus: (id: string) => void

  setLaunchOnStartup: (on: boolean) => void
  setGlobalShortcut: (accelerator: string) => void
  setMultitaskNudges: (on: boolean) => void
  setTheme: (pref: ThemePref) => void
}

/** Solo los campos que van a disco. También sirve de selector para lógica pura. */
export function persisted(s: AppState): PersistedState {
  return {
    version: s.version,
    tasks: s.tasks,
    archivedTasks: s.archivedTasks,
    projects: s.projects,
    snapshots: s.snapshots,
    streak: s.streak,
    settings: s.settings,
    lastRolloverDate: s.lastRolloverDate
  }
}

/** Día efectivo de una asignación: hoy o pasado = hoy; futuro = ese día; null = suelta. */
function effectiveDay(dateISO: string | null | undefined): string | null {
  if (!dateISO) return null
  const today = toISODate()
  return dateISO <= today ? today : dateISO
}

function newTask(text: string, projectId: string | null, date: string | null): Task {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
    projectId,
    createdDate: toISODate(),
    completedDate: null,
    daysRolled: 0,
    timeSpentMs: 0,
    focusStartedAt: null,
    scheduledDate: effectiveDay(date),
    remindAt: null,
    lastFocusedDate: null
  }
}

/** Busca una tarea viva por id. */
function findTask(s: AppState, id: string): Task | undefined {
  return s.tasks.find((t) => t.id === id)
}

/** Aplica `fn` a la tarea viva `id`. */
function mapTask(s: AppState, id: string, fn: (t: Task) => Task): Pick<AppState, 'tasks'> {
  return { tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)) }
}

/** true mientras aplicamos un estado remoto (otra ventana): no rebotar el guardado. */
let applyingRemote = false

export const useAppStore = create<AppState>((set, get) => ({
  ...INITIAL_STATE,
  hydrated: false,
  screen: 'today',
  activeProjectId: ALL_TASKS_ID,
  miniTargetId: TODAY_PROJECT_ID,
  recentCompletion: null,
  flash: null,
  editingTaskId: null,
  reward: null,

  hydrate: async () => {
    const loaded = (await window.modo?.loadState()) ?? INITIAL_STATE
    let ready = rolloverIfNeeded(normalizeState(loaded))
    // Primera vez con logros: lo que ya tenías desbloqueado no se anuncia como nuevo.
    if (ready.settings.seenAchievements === null) {
      const seen = computeGame(ready)
        .achievements.filter((a) => a.unlocked)
        .map((a) => a.id)
      ready = { ...ready, settings: { ...ready.settings, seenAchievements: seen } }
    }
    set({ ...ready, hydrated: true, activeProjectId: ALL_TASKS_ID })
    void window.modo?.saveState(persisted(get()))

    window.modo?.onStateChanged((remote) => get().applyRemote(remote))
  },

  applyRemote: (remote) => {
    applyingRemote = true
    set((s) => ({
      ...remote,
      activeProjectId:
        s.activeProjectId === ALL_TASKS_ID || remote.projects.some((p) => p.id === s.activeProjectId)
          ? s.activeProjectId
          : ALL_TASKS_ID
    }))
    applyingRemote = false
  },

  setScreen: (screen) => set({ screen }),
  setActiveProject: (activeProjectId) => set({ activeProjectId }),
  setMiniTarget: (miniTargetId) => set({ miniTargetId }),
  clearRecentCompletion: () => set({ recentCompletion: null }),
  clearReward: () => set({ reward: null }),
  setCelebrations: (on) => set((s) => ({ settings: { ...s.settings, celebrations: on } })),
  setFlash: (flash) => {
    set({ flash })
    window.setTimeout(() => {
      if (get().flash === flash) set({ flash: null })
    }, 1700)
  },

  checkRollover: () => {
    const before = persisted(get())
    const after = rolloverIfNeeded(before)
    if (after !== before) set(after)
  },

  addTask: (text, opts) => {
    if (!text.trim()) return
    const t = newTask(text, opts?.projectId ?? null, opts?.date ?? null)
    set((s) => ({ tasks: [...s.tasks, t] }))
  },

  toggleTask: (id) =>
    set((s) => {
      let reveal: CompletionReveal | null = s.recentCompletion
      const today = toISODate()
      const patch = mapTask(s, id, (t) => {
        const done = !t.done
        // al completar: cerrar el cronómetro de enfoque si estaba corriendo
        const base = done ? commitFocus(t) : t
        if (done && base.timeSpentMs >= 1000) {
          reveal = { id: t.id, text: base.text, ms: base.timeSpentMs, at: Date.now() }
        }
        return {
          ...base,
          done,
          completedDate: done ? new Date().toISOString() : null,
          // Se completó hoy: cuenta en el día (una tarea suelta o futura pasa a Hoy).
          scheduledDate:
            done && (base.scheduledDate === null || base.scheduledDate > today)
              ? today
              : base.scheduledDate
        }
      })
      // Premio por cerrar: XP, subida de nivel y logros nuevos (se avisa una sola vez).
      let rewardOut: Reward | null = s.reward
      let settings = s.settings
      const closing = patch.tasks.find((t) => t.id === id)?.done === true
      if (closing) {
        const before = computeGame(persisted(s))
        const after = computeGame({ ...persisted(s), tasks: patch.tasks })
        const seen = s.settings.seenAchievements ?? []
        const r = rewardBetween(before, after, seen)
        if (r) {
          settings = {
            ...settings,
            seenAchievements: [...new Set([...seen, ...r.achievements.map((a) => a.id)])]
          }
          if (s.settings.celebrations) rewardOut = r
        }
      }
      return { ...patch, recentCompletion: reveal, reward: rewardOut, settings }
    }),

  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  editTask: (id, text) => {
    if (text.trim()) {
      set((s) => mapTask(s, id, (t) => ({ ...t, text: text.trim() })))
    }
  },

  setEditingTask: (editingTaskId) => set({ editingTaskId }),

  setReminder: (id, remindAt) => set((s) => mapTask(s, id, (t) => ({ ...t, remindAt }))),

  duplicateTask: (id) =>
    set((s) => {
      const src = findTask(s, id)
      if (!src) return {}
      return { tasks: [...s.tasks, newTask(src.text, src.projectId, src.scheduledDate)] }
    }),

  assignDay: (id, dateISO) =>
    set((s) => {
      if (!findTask(s, id)) return {}
      const day = effectiveDay(dateISO)
      const leavingToday = day === null || day > toISODate()
      return mapTask(s, id, (t) => ({
        ...(leavingToday ? commitFocus(t) : t),
        done: false,
        completedDate: null,
        daysRolled: 0,
        scheduledDate: day
      }))
    }),

  setTaskProject: (id, projectId) =>
    set((s) => mapTask(s, id, (t) => (t.projectId === projectId ? t : { ...t, projectId }))),

  addProject: (name) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Proyecto',
      createdDate: toISODate()
    }
    set((s) => ({ projects: [...s.projects, project], activeProjectId: project.id }))
    return project.id
  },

  renameProject: (id, name) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, name: name.trim() || p.name } : p
      )
    })),

  // Quitar un proyecto solo quita la etiqueta: sus tareas se conservan (sin proyecto).
  deleteProject: (id) =>
    set((s) => {
      const unlabel = (t: Task): Task => (t.projectId === id ? { ...t, projectId: null } : t)
      return {
        projects: s.projects.filter((p) => p.id !== id),
        tasks: s.tasks.map(unlabel),
        archivedTasks: s.archivedTasks.map(unlabel),
        activeProjectId: s.activeProjectId === id ? ALL_TASKS_ID : s.activeProjectId,
        miniTargetId: s.miniTargetId === id ? TODAY_PROJECT_ID : s.miniTargetId
      }
    }),

  startFocus: (id) => {
    // Darle play = trabajarla hoy: si estaba suelta o en un día futuro, pasa a Hoy.
    set((s) =>
      mapTask(s, id, (t) => {
        if (t.focusStartedAt || t.done) return t
        const today = toISODate()
        return {
          ...t,
          focusStartedAt: Date.now(),
          lastFocusedDate: today,
          scheduledDate: t.scheduledDate === null || t.scheduledDate > today ? today : t.scheduledDate
        }
      })
    )
    // nudge de multitasking: se dispara desde la ventana que inició el enfoque
    const active = activeFocusTasks(persisted(get()))
    if (active.length >= 2 && get().settings.multitaskNudges) {
      window.modo?.notifyMultitask(active.length)
    }
  },

  stopFocus: (id) => set((s) => mapTask(s, id, (t) => commitFocus(t))),

  toggleFocus: (id) => {
    // Play/pausa con el mismo botón. Pausar cierra el tramo (suma su tiempo);
    // volver a play abre otro tramo. El total al completar = suma de todos.
    const task = findTask(get(), id)
    if (task?.focusStartedAt) get().stopFocus(id)
    else get().startFocus(id)
  },

  setLaunchOnStartup: (on) =>
    set((s) => ({ settings: { ...s.settings, launchOnStartup: on } })),

  setGlobalShortcut: (accelerator) =>
    set((s) => ({ settings: { ...s.settings, globalShortcut: accelerator } })),

  setMultitaskNudges: (on) =>
    set((s) => ({ settings: { ...s.settings, multitaskNudges: on } })),

  setTheme: (pref) => set((s) => ({ settings: { ...s.settings, theme: pref } }))
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { __appStore: typeof useAppStore }).__appStore = useAppStore
}

// --- persistencia automática (debounced) ---
let saveTimer: ReturnType<typeof setTimeout> | undefined
useAppStore.subscribe((s) => {
  if (!s.hydrated || applyingRemote) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void window.modo?.saveState(persisted(s)), 350)
})

// --- selectores derivados ---

/** Nombre del proyecto de una tarea, o null si no tiene etiqueta. */
export function projectNameOf(s: AppState, task: Task): string | null {
  return projectNameFor(s.projects, task)
}

/**
 * Lista y nombre para una vista del mini (calcúlala con useMemo: devuelve arrays nuevos):
 *  - Hoy: las tareas con día asignado hoy o antes.
 *  - Todas las tareas: todas las vivas.
 *  - un proyecto: todas las que llevan su etiqueta (vivas y archivadas, para el avance).
 */
export function targetView(
  s: Pick<PersistedState, 'tasks' | 'archivedTasks' | 'projects'> & { miniTargetId: string }
): { id: string; name: string; tasks: Task[] } {
  if (s.miniTargetId === ALL_TASKS_ID) {
    return { id: ALL_TASKS_ID, name: 'Todas las tareas', tasks: s.tasks }
  }
  if (s.miniTargetId !== TODAY_PROJECT_ID) {
    const p = s.projects.find((x) => x.id === s.miniTargetId)
    if (p) return { id: p.id, name: p.name, tasks: projectTasks(s, p.id) }
  }
  return { id: TODAY_PROJECT_ID, name: 'Hoy', tasks: todayList(s) }
}
