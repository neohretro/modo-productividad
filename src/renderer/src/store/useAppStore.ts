import { create } from 'zustand'
import {
  INITIAL_STATE,
  TODAY_PROJECT_ID,
  type PersistedState,
  type Project,
  type Task
} from '@shared/types'
import { toISODate } from '@shared/date'
import { rolloverIfNeeded } from '@shared/rollover'
import { activeFocusTasks, commitFocus, normalizeState } from '@shared/focus'

type Screen = 'today' | 'projects' | 'summary' | 'settings'

interface AppState extends PersistedState {
  hydrated: boolean
  screen: Screen
  /** proyecto abierto en la pantalla Proyectos. */
  activeProjectId: string | null

  hydrate: () => Promise<void>
  /** Aplica un estado llegado de otra ventana sin re-guardarlo. */
  applyRemote: (state: PersistedState) => void
  setScreen: (s: Screen) => void
  setActiveProject: (id: string | null) => void
  checkRollover: () => void

  addTask: (text: string, projectId: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  editTask: (id: string, text: string) => void

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
}

/** Solo los campos que van a disco. */
function persisted(s: AppState): PersistedState {
  return {
    version: s.version,
    todayTasks: s.todayTasks,
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
    focusStartedAt: null
  }
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

  hydrate: async () => {
    const loaded = (await window.modo?.loadState()) ?? INITIAL_STATE
    const normalized = normalizeState(loaded)
    const rolled = rolloverIfNeeded(normalized)
    set({
      ...rolled,
      hydrated: true,
      activeProjectId: rolled.projects[0]?.id ?? null
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

  checkRollover: () => {
    const rolled = rolloverIfNeeded(persisted(get()))
    if (rolled.lastRolloverDate !== get().lastRolloverDate) {
      set(rolled)
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

  toggleTask: (id) =>
    set((s) =>
      mapTaskEverywhere(s, id, (t) => {
        const done = !t.done
        // al completar: cerrar el cronómetro de enfoque si estaba corriendo
        const base = done ? commitFocus(t) : t
        return { ...base, done, completedDate: done ? new Date().toISOString() : null }
      })
    ),

  deleteTask: (id) =>
    set((s) => ({
      todayTasks: s.todayTasks.filter((t) => t.id !== id),
      projects: s.projects.map((p) => ({
        ...p,
        tasks: p.tasks.filter((t) => t.id !== id)
      }))
    })),

  editTask: (id, text) => {
    if (!text.trim()) return
    set((s) => mapTaskEverywhere(s, id, (t) => ({ ...t, text: text.trim() })))
  },

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
    const task = [...get().todayTasks, ...get().projects.flatMap((p) => p.tasks)].find(
      (t) => t.id === id
    )
    if (task?.focusStartedAt) get().stopFocus(id)
    else get().startFocus(id)
  },

  setLaunchOnStartup: (on) =>
    set((s) => ({ settings: { ...s.settings, launchOnStartup: on } })),

  setGlobalShortcut: (accelerator) =>
    set((s) => ({ settings: { ...s.settings, globalShortcut: accelerator } })),

  setMultitaskNudges: (on) =>
    set((s) => ({ settings: { ...s.settings, multitaskNudges: on } }))
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
