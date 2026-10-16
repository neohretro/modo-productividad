/**
 * El "juego" de la app: puntos (XP), niveles, días seguidos y logros.
 *
 * TODO se calcula a partir de lo que ya está guardado (tareas cerradas y los
 * cierres de día), sin estado propio: no hay nada extra que sincronizar, migrar
 * ni que se pueda desincronizar. Si borras una tarea hecha, el puntaje baja.
 *
 * Reglas pensadas para ser claras y justas:
 *  - cada tarea cerrada da 10 XP
 *  - +1 XP por cada 10 min de enfoque medido (hasta +10)
 *  - +10 XP si la tarea llevaba 3 o más días rodando ("¡al fin!")
 *  - +25 XP por cada día perfecto (cerraste todo tu día, mínimo 2 tareas)
 */
import type { PersistedState, Task } from './types'
import { addDaysISO, localDayOf, toISODate } from './date'

export const XP_BASE = 10
export const XP_PERFECT_DAY = 25

/** XP acumulado necesario para ALCANZAR el nivel n (n ≥ 1). */
export function xpForLevel(n: number): number {
  return 40 * n * (n - 1)
}

export const LEVEL_TITLES = [
  'Semilla',
  'Aprendiz',
  'Explorador',
  'Creador',
  'Constante',
  'Imparable',
  'Maestro',
  'Leyenda',
  'Genio',
  'Modo creador'
]

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1]
}

export function levelFromXp(xp: number): number {
  let n = 1
  while (xpForLevel(n + 1) <= xp) n++
  return n
}

/** XP que vale una tarea cerrada. */
export function xpForTask(t: Task): number {
  if (!t.done) return 0
  let xp = XP_BASE
  xp += Math.min(10, Math.floor(t.timeSpentMs / 600_000))
  if (t.daysRolled >= 3) xp += 10
  return xp
}

export interface Achievement {
  id: string
  title: string
  desc: string
  /** nombre del ícono (lucide) para la interfaz. */
  icon: 'check' | 'flame' | 'star' | 'clock' | 'sun' | 'moon' | 'folder' | 'rocket' | 'trophy' | 'target'
  value: number
  target: number
  unlocked: boolean
}

export interface GameState {
  xp: number
  level: number
  title: string
  /** XP dentro del nivel actual y cuánto abarca ese nivel (para la barra). */
  xpInLevel: number
  xpSpan: number
  nextTitle: string
  streakDays: number
  bestStreak: number
  /** hoy todavía no cerraste nada, pero ayer sí: la racha está en juego. */
  streakAtRisk: boolean
  doneToday: number
  perfectDays: number
  perfectToday: boolean
  totalTasks: number
  totalTimeMs: number
  achievements: Achievement[]
}

interface Done {
  task: Task
  day: string
  hour: number
}

/** Días seguidos terminando hoy (o ayer, si hoy aún no cerraste nada). */
function streaks(days: Set<string>, today: string): { current: number; best: number; atRisk: boolean } {
  const walk = (start: string): number => {
    let n = 0
    let d = start
    while (days.has(d)) {
      n++
      d = addDaysISO(d, -1)
    }
    return n
  }
  const yesterday = addDaysISO(today, -1)
  const doneToday = days.has(today)
  const current = doneToday ? walk(today) : walk(yesterday)
  const atRisk = !doneToday && days.has(yesterday)

  // mejor racha histórica
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    run = prev !== null && addDaysISO(prev, 1) === d ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  return { current, best, atRisk }
}

export function computeGame(
  state: Pick<PersistedState, 'tasks' | 'archivedTasks' | 'snapshots'>,
  now: Date = new Date()
): GameState {
  const today = toISODate(now)
  const dones: Done[] = [...state.tasks, ...state.archivedTasks]
    .filter((t) => t.done)
    .map((t) => {
      const when = t.completedDate ?? ''
      return { task: t, day: when ? localDayOf(when) : '', hour: when ? new Date(when).getHours() : -1 }
    })

  // --- día perfecto: pasados (por el cierre de cada día) + hoy si ya está todo hecho ---
  const perfectPast = state.snapshots.filter((s) => s.totalTasks >= 2 && s.completionRate >= 1).length
  const todaysList = state.tasks.filter((t) => t.scheduledDate !== null && t.scheduledDate <= today)
  const perfectToday = todaysList.length >= 2 && todaysList.every((t) => t.done)
  const perfectDays = perfectPast + (perfectToday ? 1 : 0)

  let xp = perfectDays * XP_PERFECT_DAY
  let totalTimeMs = 0
  const activeDays = new Set<string>()
  const perDay = new Map<string, number>()
  const projects = new Set<string>()
  let rescued = false
  let early = false
  let night = false

  for (const x of dones) {
    xp += xpForTask(x.task)
    totalTimeMs += x.task.timeSpentMs
    if (x.day) {
      activeDays.add(x.day)
      perDay.set(x.day, (perDay.get(x.day) ?? 0) + 1)
    }
    if (x.task.projectId) projects.add(x.task.projectId)
    if (x.task.daysRolled >= 5) rescued = true
    if (x.hour >= 4 && x.hour < 8) early = true
    if (x.hour >= 22 || (x.hour >= 0 && x.hour < 4)) night = true
  }

  const level = levelFromXp(xp)
  const st = streaks(activeDays, today)
  const bestInDay = Math.max(0, ...perDay.values())

  const A = (
    id: string,
    title: string,
    desc: string,
    icon: Achievement['icon'],
    value: number,
    target: number
  ): Achievement => ({ id, title, desc, icon, value, target, unlocked: value >= target })

  const totalTasks = dones.length
  const hours = totalTimeMs / 3_600_000
  const best = Math.max(st.best, st.current)

  const achievements: Achievement[] = [
    A('first', 'Primer paso', 'Cierra tu primera tarea', 'check', totalTasks, 1),
    A('t10', 'Calentando', 'Cierra 10 tareas', 'check', totalTasks, 10),
    A('t50', 'En marcha', 'Cierra 50 tareas', 'rocket', totalTasks, 50),
    A('t100', 'Centenario', 'Cierra 100 tareas', 'trophy', totalTasks, 100),
    A('t250', 'Imparable', 'Cierra 250 tareas', 'trophy', totalTasks, 250),
    A('streak3', 'Tres seguidos', '3 días seguidos cerrando tareas', 'flame', best, 3),
    A('streak7', 'Semana de fuego', '7 días seguidos', 'flame', best, 7),
    A('streak14', 'Dos semanas', '14 días seguidos', 'flame', best, 14),
    A('streak30', 'Hábito de hierro', '30 días seguidos', 'flame', best, 30),
    A('perfect1', 'Día perfecto', 'Cierra todas las tareas de un día (mínimo 2)', 'star', perfectDays, 1),
    A('perfect5', 'Cinco perfectos', '5 días perfectos', 'star', perfectDays, 5),
    A('day5', 'Día productivo', 'Cierra 5 tareas en un solo día', 'target', bestInDay, 5),
    A('day10', 'Día imparable', 'Cierra 10 tareas en un solo día', 'target', bestInDay, 10),
    A('focus1', 'Enfocado', 'Acumula 1 hora de enfoque medido', 'clock', Math.floor(hours * 10) / 10, 1),
    A('focus10', 'Hora tras hora', '10 horas de enfoque', 'clock', Math.floor(hours * 10) / 10, 10),
    A('focus50', 'Maratón', '50 horas de enfoque', 'clock', Math.floor(hours * 10) / 10, 50),
    A('projects3', 'Varios frentes', 'Cierra tareas en 3 proyectos distintos', 'folder', projects.size, 3),
    A('rescue', 'Al fin', 'Cierra una tarea que llevaba 5 días o más pendiente', 'rocket', rescued ? 1 : 0, 1),
    A('early', 'Madrugador', 'Cierra una tarea entre las 4 y las 8 am', 'sun', early ? 1 : 0, 1),
    A('night', 'Búho', 'Cierra una tarea de noche (10 pm - 4 am)', 'moon', night ? 1 : 0, 1)
  ]

  return {
    xp,
    level,
    title: levelTitle(level),
    xpInLevel: xp - xpForLevel(level),
    xpSpan: xpForLevel(level + 1) - xpForLevel(level),
    nextTitle: levelTitle(level + 1),
    streakDays: st.current,
    bestStreak: best,
    streakAtRisk: st.atRisk,
    doneToday: perDay.get(today) ?? 0,
    perfectDays,
    perfectToday,
    totalTasks,
    totalTimeMs,
    achievements
  }
}

export interface Reward {
  id: string
  xp: number
  levelUp: { level: number; title: string } | null
  achievements: { id: string; title: string }[]
  perfectDay: boolean
}

/**
 * Qué ganó el usuario entre dos fotos del juego (antes y después de cerrar una
 * tarea). `seen` son los logros que ya se le avisaron.
 */
export function rewardBetween(before: GameState, after: GameState, seen: string[]): Reward | null {
  const xp = after.xp - before.xp
  const fresh = after.achievements.filter((a) => a.unlocked && !seen.includes(a.id))
  const levelUp = after.level > before.level ? { level: after.level, title: after.title } : null
  const perfectDay = after.perfectToday && !before.perfectToday
  if (xp <= 0 && fresh.length === 0 && !levelUp) return null
  return {
    id: crypto.randomUUID(),
    xp: Math.max(0, xp),
    levelUp,
    achievements: fresh.map((a) => ({ id: a.id, title: a.title })),
    perfectDay
  }
}

/** Frase corta y animada para el estado del día (Hoy). */
export function dayMessage(g: GameState, pending: number, total: number): string {
  if (total === 0) return 'Agrega tu primera tarea de hoy'
  if (pending === 0) return g.perfectToday ? '¡Día perfecto! Todo hecho.' : '¡Todo hecho por hoy!'
  const faltan = `${pending === 1 ? 'Te falta' : 'Te faltan'} ${pending} para cerrar el día`
  if (g.streakAtRisk && g.doneToday === 0) return `${faltan}. Cierra una y mantienes tu racha.`
  if (g.doneToday > 0 && pending === 1) return 'Una más y cierras el día.'
  return faltan
}
