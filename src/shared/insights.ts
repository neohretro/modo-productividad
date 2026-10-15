/**
 * Resumen y sugerencias a partir de los datos del usuario (PLAN.md §4.2).
 * Lógica pura y local — sin IA, sin red. Observaciones sobre tus propios datos,
 * nunca consejos genéricos ni tono de regaño.
 */
import type { PersistedState, Task } from './types'
import { daysBetween, toISODate } from './date'
import { formatDurationLong } from './focus'
import { projectProgressOf, projectTasks, todayList } from './tasks'

export type Period = 'today' | 'week' | 'month'

export const PERIOD_LABEL: Record<Period, string> = {
  today: 'Hoy',
  week: '7 días',
  month: '30 días'
}

const PERIOD_DAYS: Record<Period, number> = { today: 1, week: 7, month: 30 }

export interface WorkedGroup {
  projectId: string | null
  projectName: string
  tasks: { text: string; completedDate: string; timeSpentMs: number }[]
  totalTimeMs: number
}

export interface Suggestion {
  tone: 'nudge' | 'win' | 'info'
  text: string
}

export interface Summary {
  period: Period
  completedCount: number
  totalTimeMs: number
  trackedCount: number
  worked: WorkedGroup[]
  projectProgress: { id: string; name: string; done: number; total: number; pct: number }[]
  consistency: { date: string; rate: number; hasData: boolean }[]
  suggestions: Suggestion[]
}

function inPeriod(completedDate: string | null, period: Period, now: Date): boolean {
  if (!completedDate) return false
  const d = completedDate.slice(0, 10)
  const today = toISODate(now)
  if (period === 'today') return d === today
  return daysBetween(d, today) < PERIOD_DAYS[period] && daysBetween(d, today) >= 0
}

function projectNameOf(state: PersistedState, projectId: string | null): string {
  if (projectId === null) return 'Sin proyecto'
  return state.projects.find((p) => p.id === projectId)?.name ?? 'Sin proyecto'
}

export function buildSummary(state: PersistedState, period: Period, now: Date = new Date()): Summary {
  const allTasks: Task[] = [...state.tasks, ...state.archivedTasks]

  const completed = allTasks.filter((t) => t.done && inPeriod(t.completedDate, period, now))

  // agrupar por proyecto
  const byProject = new Map<string | null, WorkedGroup>()
  for (const t of completed) {
    const g =
      byProject.get(t.projectId) ??
      ({
        projectId: t.projectId,
        projectName: projectNameOf(state, t.projectId),
        tasks: [],
        totalTimeMs: 0
      } satisfies WorkedGroup)
    g.tasks.push({
      text: t.text,
      completedDate: t.completedDate ?? '',
      timeSpentMs: t.timeSpentMs
    })
    g.totalTimeMs += t.timeSpentMs
    byProject.set(t.projectId, g)
  }
  const worked = [...byProject.values()].sort((a, b) => b.tasks.length - a.tasks.length)

  const totalTimeMs = completed.reduce((acc, t) => acc + t.timeSpentMs, 0)
  const trackedCount = completed.filter((t) => t.timeSpentMs > 0).length

  const projectProgress = state.projects.map((p) => {
    const { done, total, pct } = projectProgressOf(state, p.id)
    return { id: p.id, name: p.name, done, total, pct }
  })

  // consistencia: últimos 14 días desde snapshots
  const consistency: Summary['consistency'] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const iso = toISODate(d)
    const snap = state.snapshots.find((s) => s.date === iso)
    consistency.push({ date: iso, rate: snap?.completionRate ?? 0, hasData: !!snap })
  }

  return {
    period,
    completedCount: completed.length,
    totalTimeMs,
    trackedCount,
    worked,
    projectProgress,
    consistency,
    suggestions: buildSuggestions(state, period, completed, totalTimeMs, trackedCount, now)
  }
}

function buildSuggestions(
  state: PersistedState,
  period: Period,
  completed: Task[],
  totalTimeMs: number,
  trackedCount: number,
  now: Date
): Suggestion[] {
  const nudges: Suggestion[] = []
  const wins: Suggestion[] = []
  const info: Suggestion[] = []

  // 1. tareas que llevan días rodando
  const stuck = todayList(state, now)
    .filter((t) => !t.done && t.daysRolled >= 3)
    .sort((a, b) => b.daysRolled - a.daysRolled)
  if (stuck[0]) {
    nudges.push({
      tone: 'nudge',
      text: `«${trim(stuck[0].text)}» lleva ${stuck[0].daysRolled} días rodando. ¿La partes en algo más chico o la sueltas?`
    })
  }

  // 2. tasa de cierre esta semana vs la anterior
  const rate = (from: number, to: number): number | null => {
    const days: number[] = []
    for (let i = from; i < to; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const snap = state.snapshots.find((s) => s.date === toISODate(d))
      if (snap) days.push(snap.completionRate)
    }
    return days.length ? days.reduce((a, b) => a + b, 0) / days.length : null
  }
  const thisWeek = rate(0, 7)
  const lastWeek = rate(7, 14)
  if (thisWeek !== null && lastWeek !== null && lastWeek - thisWeek > 0.15) {
    nudges.push({
      tone: 'nudge',
      text: 'Esta semana cerraste menos días completos que la anterior. ¿Menos tareas por día?'
    })
  }

  // 3. proyecto sin movimiento
  for (const p of state.projects) {
    const all = projectTasks(state, p.id)
    if (all.length === 0 || all.every((t) => t.done)) continue
    const lastCreated = all
      .map((t) => t.createdDate)
      .sort()
      .at(-1)
    if (lastCreated && daysBetween(lastCreated, toISODate(now)) > 5) {
      info.push({
        tone: 'info',
        text: `${trim(p.name)} no tiene movimiento hace ${daysBetween(lastCreated, toISODate(now))} días.`
      })
    }
  }

  // 4. racha en buen ritmo
  if (state.streak.current >= 3) {
    wins.push({
      tone: 'win',
      text: `Racha de ${state.streak.current} días. Vas en buen ritmo — no la sueltes.`
    })
  }

  // 5. tiempo por tarea
  if (trackedCount >= 2) {
    const avg = totalTimeMs / trackedCount
    info.push({
      tone: 'info',
      text: `Promedio por tarea con cronómetro: ${formatDurationLong(avg)} (${trackedCount} tareas).`
    })
  }

  // 6. refuerzo simple si cerró cosas y no hay otra cosa que decir
  if (completed.length > 0 && nudges.length === 0 && wins.length === 0) {
    wins.push({
      tone: 'win',
      text: `${completed.length} ${completed.length === 1 ? 'tarea cerrada' : 'tareas cerradas'} en ${PERIOD_LABEL[period].toLowerCase()}. Bien.`
    })
  }

  if (completed.length === 0 && nudges.length === 0) {
    info.push({
      tone: 'info',
      text: 'Sin tareas cerradas en este período todavía. Empieza por una.'
    })
  }

  return [...nudges, ...wins, ...info].slice(0, 5)
}

function trim(s: string, max = 42): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
