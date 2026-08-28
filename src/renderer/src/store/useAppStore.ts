import { create } from 'zustand'
import {
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
import { activateDue } from '@shared/schedule'

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
  /** proyecto abierto en la pantalla Proyectos. */
  activeProjectId: string | null
  /** lista que muestra el modo mini: TODAY_PROJECT_ID o el id de un proyecto. */
  miniTargetId: string
  /** última tarea completada con tiempo — la muestra el toast, luego se limpia. */
  recentCompletion: CompletionReveal | null
  /** mensaje efímero ("copiado", "movida a mañana"…). */
  flash: string | null
  /** tarea en modo edición inline (doble clic o menú "Editar"). */
  editingTaskId: string | null

  hydrate: () => Promise<void>
  /** Aplica un estado llegado de otra ventana sin re-guardarlo. */
  applyRemote: (state: PersistedState) => void
  setScreen: (s: Screen) => void
  setActiveProject: (id: string | null) => void
  setMiniTarget: (id: string) => void
  clearRecentCompletion: () => void
  setFlash: (msg: string) => void
  checkRollover: () => void

  addTask: (text: string, projectId: string) => void
  /** Agrega una tarea a un día concreto (hoy/pasado → Hoy; futuro → programada). */
  addTaskOn: (text: string, dateISO: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  editTask: (id: string, text: string) => void
  setEditingTask: (id: string | null) => void
  duplicateTask: (id: string) => void
  /** Programa una tarea de Hoy para una fecha (ISO). Fecha pasada/hoy = la activa ya. */
  moveTaskToDate: (id: string, dateISO: string) => void
  /** Trae una tarea programada de vuelta a Hoy ahora. */
  unscheduleTask: (id: string) => void
  /** Mueve una tarea entre Hoy y un proyecto. */
  moveTaskToProject: (id: string, projectId: string) => void

  addProject: (name: string) => string
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void

  /** Inicia el cronómetro de enfoque de una tarea. */
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
    todayTasks: s.todayTasks,
    scheduledTasks: s.scheduledTasks,
    archivedTasks: s.archivedTasks,
    projects: s.projects,
    snapshots: s.snapshots,
    streak: s.streak,
    settings: s.settings,
    lastRolloverDate: s.lastRolloverDate
  }
}

function newTask(text: string, projectId: string): Task {
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
    scheduledDate: null
  }
}

/** Busca una tarea viva por id (Hoy, programadas o proyectos). */
function findTask(s: AppState, id: string): Task | undefined {
  return (
    s.todayTasks.find((t) => t.id === id) ??
    s.scheduledTasks.find((t) => t.id === id) ??
    s.projects.flatMap((p) => p.tasks).find((t) => t.id === id)
  )
}

/** Aplica `fn` a la tarea `id` viva donde sea que esté (Hoy o un proyecto). */
function mapTaskEverywhere(
  s: AppState,
  id: string,
  fn: (t: Task) => Task
): Pick<AppState, 'todayTasks' | 'projects'> {
  return {
    todayTasks: s.todayTasks.map((t) => (t.id === id ? fn(t) : t)),
    projects: s.projects.map((p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === id ? fn(t) : t))
    }))
  }
}

/** true mientras aplicamos un estado remoto (otra ventana): no rebotar el guardado. */
let applyingRemote = false

export const useAppStore = create<AppState>((set, get) => ({
  ...INITIAL_STATE,
  hydrated: false,
  screen: 'today',
  activeProjectId: null,
  miniTargetId: TODAY_PROJECT_ID,
  recentCompletion: null,
  flash: null,
  editingTaskId: null,

  hydrate: async () => {
    const loaded = (await window.modo?.loadState()) ?? INITIAL_STATE
    const ready = activateDue(rolloverIfNeeded(normalizeState(loaded)))
    set({
      ...ready,
      hydrated: true,
      activeProjectId: ready.projects[0]?.id ?? null
    })
    void window.modo?.saveState(persisted(get()))

    window.modo?.onStateChanged((remote) => get().applyRemote(remote))
  },

  applyRemote: (remote) => {
    applyingRemote = true
    set((s) => ({
      ...remote,
      activeProjectId:
        remote.projects.some((p) => p.id === s.activeProjectId)
          ? s.activeProjectId
          : (remote.projects[0]?.id ?? null)
    }))
    applyingRemote = false
  },

  setScreen: (screen) => set({ screen }),
  setActiveProject: (activeProjectId) => set({ activeProjectId }),
  setMiniTarget: (miniTargetId) => set({ miniTargetId }),
  clearRecentCompletion: () => set({ recentCompletion: null }),
  setFlash: (flash) => {
    set({ flash })
    window.setTimeout(() => {
      if (get().flash === flash) set({ flash: null })
    }, 1700)
  },

  checkRollover: () => {
    const before = persisted(get())
    const after = activateDue(rolloverIfNeeded(before))
    if (
      after.lastRolloverDate !== before.lastRolloverDate ||
      after.todayTasks.length !== before.todayTasks.length
    ) {
      set(after)
    }
  },

  addTask: (text, projectId) => {
    if (!text.trim()) return
    const t = newTask(text, projectId)
    if (projectId === TODAY_PROJECT_ID) {
      set((s) => ({ todayTasks: [...s.todayTasks, t] }))
    } else {
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, tasks: [...p.tasks, t] } : p
        )
      }))
    }
  },

  addTaskOn: (text, dateISO) => {
    if (!text.trim()) return
    const today = toISODate()
    if (dateISO <= today) {
      set((s) => ({ todayTasks: [...s.todayTasks, newTask(text, TODAY_PROJECT_ID)] }))
    } else {
      set((s) => ({
        scheduledTasks: [
          ...s.scheduledTasks,
          { ...newTask(text, TODAY_PROJECT_ID), scheduledDate: dateISO }
        ]
      }))
    }
  },

  toggleTask: (id) =>
    set((s) => {
      let reveal: CompletionReveal | null = s.recentCompletion
      const patch = mapTaskEverywhere(s, id, (t) => {
        const done = !t.done
        // al completar: cerrar el cronómetro de enfoque si estaba corriendo
        const base = done ? commitFocus(t) : t
        if (done && base.timeSpentMs >= 1000) {
          reveal = { id: t.id, text: base.text, ms: base.timeSpentMs, at: Date.now() }
        }
        return { ...base, done, completedDate: done ? new Date().toISOString() : null }
      })
      return { ...patch, recentCompletion: reveal }
    }),

  deleteTask: (id) =>
    set((s) => ({
      todayTasks: s.todayTasks.filter((t) => t.id !== id),
      scheduledTasks: s.scheduledTasks.filter((t) => t.id !== id),
      projects: s.projects.map((p) => ({
        ...p,
        tasks: p.tasks.filter((t) => t.id !== id)
      }))
    })),

  editTask: (id, text) => {
    if (text.trim()) {
      set((s) => mapTaskEverywhere(s, id, (t) => ({ ...t, text: text.trim() })))
    }
  },

  setEditingTask: (editingTaskId) => set({ editingTaskId }),

  duplicateTask: (id) =>
    set((s) => {
      const src = findTask(s, id)
      if (!src) return {}
      const copy = newTask(src.text, src.projectId)
      if (src.projectId === TODAY_PROJECT_ID) {
        return { todayTasks: [...s.todayTasks, copy] }
      }
      return {
        projects: s.projects.map((p) =>
          p.id === src.projectId ? { ...p, tasks: [...p.tasks, copy] } : p
        )
      }
    }),

  moveTaskToDate: (id, dateISO) =>
    set((s) => {
      const src = findTask(s, id)
      if (!src) return {}
      const today = toISODate()
      const future = dateISO > today
      const moved: Task = {
        ...commitFocus(src),
        done: false,
        completedDate: null,
        projectId: TODAY_PROJECT_ID,
        daysRolled: 0,
        scheduledDate: future ? dateISO : null
      }
      const stripped = {
        todayTasks: s.todayTasks.filter((t) => t.id !== id),
        scheduledTasks: s.scheduledTasks.filter((t) => t.id !== id),
        projects: s.projects.map((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) }))
      }
      return future
        ? { ...stripped, scheduledTasks: [...stripped.scheduledTasks, moved] }
        : { ...stripped, todayTasks: [...stripped.todayTasks, moved] }
    }),

  unscheduleTask: (id) => get().moveTaskToDate(id, toISODate()),

  moveTaskToProject: (id, projectId) =>
    set((s) => {
      const src = findTask(s, id)
      if (!src || src.projectId === projectId) return {}
      const moved: Task = { ...commitFocus(src), projectId, scheduledDate: null }
      const stripped = {
        todayTasks: s.todayTasks.filter((t) => t.id !== id),
        scheduledTasks: s.scheduledTasks.filter((t) => t.id !== id),
        projects: s.projects.map((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) }))
      }
      if (projectId === TODAY_PROJECT_ID) {
        return { ...stripped, todayTasks: [...stripped.todayTasks, { ...moved, daysRolled: 0 }] }
      }
      return {
        ...stripped,
        projects: stripped.projects.map((p) =>
          p.id === projectId ? { ...p, tasks: [...p.tasks, moved] } : p
        )
      }
    }),

  addProject: (name) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Proyecto',
      createdDate: toISODate(),
      tasks: []
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

  deleteProject: (id) =>
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      return {
        projects,
        activeProjectId:
          s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId
      }
    }),

  startFocus: (id) => {
    set((s) =>
      mapTaskEverywhere(s, id, (t) =>
        t.focusStartedAt || t.done ? t : { ...t, focusStartedAt: Date.now() }
      )
    )
    // nudge de multitasking: se dispara desde la ventana que inició el enfoque
    const active = activeFocusTasks(persisted(get()))
    if (active.length >= 2 && get().settings.multitaskNudges) {
      window.modo?.notifyMultitask(active.length)
    }
  },

  stopFocus: (id) =>
    set((s) => mapTaskEverywhere(s, id, (t) => commitFocus(t))),

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
export const projectProgress = (
  p: Project
): { done: number; total: number; pct: number } => {
  const total = p.tasks.length
  const done = p.tasks.filter((t) => t.done).length
  return { done, total, pct: total === 0 ? 0 : done / total }
}

/** Lista y nombre para un "target" del mini (Hoy o un proyecto). */
export function targetView(s: AppState): { id: string; name: string; tasks: Task[] } {
  if (s.miniTargetId === TODAY_PROJECT_ID) {
    return { id: TODAY_PROJECT_ID, name: 'Hoy', tasks: s.todayTasks }
  }
  const p = s.projects.find((x) => x.id === s.miniTargetId)
  if (!p) return { id: TODAY_PROJECT_ID, name: 'Hoy', tasks: s.todayTasks }
  return { id: p.id, name: p.name, tasks: p.tasks }
}
