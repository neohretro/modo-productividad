/**
 * Resumen y análisis a partir de los datos del usuario (PLAN.md §4.2).
 * Lógica pura y local: sin IA, sin red. Observaciones sobre tus propios datos,
 * nunca consejos genéricos ni tono de regaño.
 *
 * Qué mide: tareas completadas (con su día y hora de cierre), tiempo con
 * cronómetro (se atribuye al día en que se cerró la tarea), proyecto (etiqueta),
 * lo pendiente y lo que lleva días rodando. Cada período se compara con el
 * anterior de la misma duración.
 */
import type { PersistedState, Task } from './types'
import { addDaysISO, daysBetween, localDayOf, toISODate } from './date'
import { formatDurationLong } from './focus'
import { looseTasks, projectProgressOf, scheduledAhead, todayList } from './tasks'
import {
  buildProfile,
  buildRecommendations,
  peakWindow,
  type ProfileInput,
  type Recommendation,
  type WorkProfile
} from './profile'

export type Period = 'today' | 'week' | 'month' | 'all' | 'custom'

/** Tramo de fechas elegido por la persona (ambos incluidos, formato AAAA-MM-DD). */
export interface DateRange {
  from: string
  to: string
}

export const PERIOD_LABEL: Record<Period, string> = {
  today: 'Hoy',
  week: '7 días',
  month: '30 días',
  all: 'Todo',
  custom: 'Fechas'
}

const PERIOD_DAYS: Record<Exclude<Period, 'all' | 'custom'>, number> = { today: 1, week: 7, month: 30 }

const DOW_LABEL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

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

/** Un número del período y el mismo número del período anterior (null si no aplica). */
export interface Kpi {
  value: number
  prev: number | null
}

export interface ProjectShare {
  id: string | null
  name: string
  tasks: number
  timeMs: number
  /** 0..1 sobre el total de tareas del período. */
  taskShare: number
  /** 0..1 sobre el total del tiempo del período (0 si no hay tiempo medido). */
  timeShare: number
  /** tiempo promedio por tarea con cronómetro, o null. */
  avgMs: number | null
}

export interface DayPoint {
  date: string
  count: number
  timeMs: number
  isToday: boolean
}

export interface Summary {
  period: Period
  /** ventana analizada, p. ej. "17 sep – 15 oct". */
  rangeLabel: string
  days: number

  completed: Kpi
  timeMs: Kpi
  created: Kpi
  trackedCount: number
  /** tiempo promedio por tarea con cronómetro, o null. */
  avgTaskMs: number | null
  /** qué fracción de las tareas cerradas tiene tiempo medido (0..1). */
  coverage: number
  activeDays: number
  /** promedio de cierre de los días (snapshots) del período, 0..1, o null. */
  closeRate: number | null

  byProject: ProjectShare[]
  daily: DayPoint[]
  weekday: {
    dow: number
    label: string
    count: number
    timeMs: number
    /** cuántas veces cae ese día de la semana dentro del período. */
    occurrences: number
    /** promedio de tareas cerradas por ese día de la semana. */
    avg: number
  }[]
  /** tareas cerradas por hora local del día (24) y su promedio por día con tareas. */
  hourly: { hour: number; count: number; avgPerActiveDay: number }[]
  /** mejor franja de 2 horas seguidas, o null. */
  peakWindow: { from: number; to: number; count: number; share: number } | null
  /** mejor y peor día de la semana por promedio (solo con datos suficientes). */
  bestDay: { label: string; avg: number } | null
  worstDay: { label: string; avg: number } | null
  averages: {
    perCalendarDay: number
    perActiveDay: number
    perWeek: number | null
    timePerActiveDayMs: number | null
  }
  maxRun: number
  profile: WorkProfile
  recommendations: Recommendation[]
  dayparts: { id: 'madrugada' | 'manana' | 'tarde' | 'noche'; label: string; hours: string; count: number }[]
  longest: { text: string; projectName: string; timeMs: number; day: string }[]
  stuck: { text: string; projectName: string; daysRolled: number }[]
  backlog: { today: number; loose: number; planned: number }
  worked: WorkedGroup[]
  projectProgress: { id: string; name: string; done: number; total: number; pct: number }[]
  consistency: { date: string; rate: number; hasData: boolean }[]
  streak: { current: number; best: number }
  suggestions: Suggestion[]

  // atajos (compatibilidad)
  completedCount: number
  totalTimeMs: number
}

interface Done {
  task: Task
  day: string
  hour: number
}

function nameOf(state: PersistedState, projectId: string | null): string {
  if (projectId === null) return 'Sin proyecto'
  return state.projects.find((p) => p.id === projectId)?.name ?? 'Sin proyecto'
}

function inWin(day: string, from: string, to: string): boolean {
  return day >= from && day <= to
}

function fmtDay(iso: string): string {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString('es', { day: 'numeric', month: 'short' })
    .replace('.', '')
}

/** Ordena el tramo y lo recorta al día de hoy (no hay tareas cerradas en el futuro). */
export function normalizeRange(range: DateRange, today: string): DateRange {
  const [a, b] = range.from <= range.to ? [range.from, range.to] : [range.to, range.from]
  const to = b > today ? today : b
  const from = a > to ? to : a
  return { from, to }
}

export function buildSummary(
  state: PersistedState,
  period: Period,
  now: Date = new Date(),
  range?: DateRange
): Summary {
  const today = toISODate(now)

  // --- tareas cerradas (vivas + archivadas) con su día y hora LOCALES ---
  const dones: Done[] = [...state.tasks, ...state.archivedTasks]
    .filter((t) => t.done && t.completedDate)
    .map((t) => {
      const d = new Date(t.completedDate as string)
      return { task: t, day: localDayOf(t.completedDate as string), hour: d.getHours() }
    })

  // --- ventana actual y anterior ---
  let from: string
  let to = today
  let days: number
  if (period === 'all') {
    const first = dones.reduce<string>((min, x) => (x.day < min ? x.day : min), today)
    from = first
    days = Math.max(1, daysBetween(first, today) + 1)
  } else if (period === 'custom') {
    const r = normalizeRange(range ?? { from: today, to: today }, today)
    from = r.from
    to = r.to
    days = daysBetween(from, to) + 1
  } else {
    days = PERIOD_DAYS[period]
    from = addDaysISO(today, -(days - 1))
  }
  const prevTo = addDaysISO(from, -1)
  const prevFrom = addDaysISO(prevTo, -(days - 1))
  const hasPrev = period !== 'all'

  const cur = dones.filter((x) => inWin(x.day, from, to))
  const prev = hasPrev ? dones.filter((x) => inWin(x.day, prevFrom, prevTo)) : []
  const sumTime = (xs: Done[]): number => xs.reduce((a, x) => a + x.task.timeSpentMs, 0)

  const allTasks = [...state.tasks, ...state.archivedTasks]
  const createdIn = (a: string, b: string): number =>
    allTasks.filter((t) => t.createdDate && inWin(t.createdDate, a, b)).length

  const totalTime = sumTime(cur)
  const trackedCount = cur.filter((x) => x.task.timeSpentMs > 0).length

  // --- por proyecto ---
  const groups = new Map<string | null, { tasks: number; timeMs: number; tracked: number }>()
  for (const x of cur) {
    const g = groups.get(x.task.projectId) ?? { tasks: 0, timeMs: 0, tracked: 0 }
    g.tasks += 1
    g.timeMs += x.task.timeSpentMs
    if (x.task.timeSpentMs > 0) g.tracked += 1
    groups.set(x.task.projectId, g)
  }
  const byProject: ProjectShare[] = [...groups.entries()]
    .map(([id, g]) => ({
      id,
      name: nameOf(state, id),
      tasks: g.tasks,
      timeMs: g.timeMs,
      taskShare: cur.length === 0 ? 0 : g.tasks / cur.length,
      timeShare: totalTime === 0 ? 0 : g.timeMs / totalTime,
      avgMs: g.tracked > 0 ? g.timeMs / g.tracked : null
    }))
    .sort((a, b) => b.tasks - a.tasks || b.timeMs - a.timeMs)

  // --- por día (gráfica) ---
  const chartDays = period === 'all' || period === 'custom' ? Math.min(days, 60) : Math.max(days, 7)
  const daily: DayPoint[] = []
  for (let i = chartDays - 1; i >= 0; i--) {
    const date = addDaysISO(to, -i)
    const ofDay = dones.filter((x) => x.day === date)
    daily.push({ date, count: ofDay.length, timeMs: sumTime(ofDay), isToday: date === today })
  }

  // --- por día de la semana ---
  const weekday = DOW_LABEL.map((label, dow) => ({
    dow,
    label,
    count: 0,
    timeMs: 0,
    occurrences: 0,
    avg: 0
  }))
  for (const x of cur) {
    const dow = (new Date(`${x.day}T00:00:00`).getDay() + 6) % 7
    weekday[dow].count += 1
    weekday[dow].timeMs += x.task.timeSpentMs
  }
  for (let i = 0; i < days; i++) {
    const dow = (new Date(`${addDaysISO(from, i)}T00:00:00`).getDay() + 6) % 7
    weekday[dow].occurrences += 1
  }
  for (const w of weekday) w.avg = w.occurrences === 0 ? 0 : w.count / w.occurrences

  // --- por momento del día ---
  const dayparts: Summary['dayparts'] = [
    { id: 'madrugada', label: 'Madrugada', hours: '12 am - 6 am', count: 0 },
    { id: 'manana', label: 'Mañana', hours: '6 am - 12 pm', count: 0 },
    { id: 'tarde', label: 'Tarde', hours: '12 pm - 6 pm', count: 0 },
    { id: 'noche', label: 'Noche', hours: '6 pm - 12 am', count: 0 }
  ]
  for (const x of cur) {
    const i = x.hour < 6 ? 0 : x.hour < 12 ? 1 : x.hour < 18 ? 2 : 3
    dayparts[i].count += 1
  }

  // --- las que más tiempo llevaron ---
  const longest = cur
    .filter((x) => x.task.timeSpentMs > 0)
    .sort((a, b) => b.task.timeSpentMs - a.task.timeSpentMs)
    .slice(0, 5)
    .map((x) => ({
      text: x.task.text,
      projectName: nameOf(state, x.task.projectId),
      timeMs: x.task.timeSpentMs,
      day: x.day
    }))

  // --- lo pendiente ---
  const inToday = todayList(state, now)
  const stuck = inToday
    .filter((t) => !t.done && t.daysRolled >= 2)
    .sort((a, b) => b.daysRolled - a.daysRolled)
    .slice(0, 5)
    .map((t) => ({ text: t.text, projectName: nameOf(state, t.projectId), daysRolled: t.daysRolled }))
  const backlog = {
    today: inToday.filter((t) => !t.done).length,
    loose: looseTasks(state).length,
    planned: scheduledAhead(state, now).filter((t) => !t.done).length
  }

  // --- en qué trabajaste (detalle por proyecto) ---
  const byProjectDetail = new Map<string | null, WorkedGroup>()
  for (const x of cur) {
    const g =
      byProjectDetail.get(x.task.projectId) ??
      ({
        projectId: x.task.projectId,
        projectName: nameOf(state, x.task.projectId),
        tasks: [],
        totalTimeMs: 0
      } satisfies WorkedGroup)
    g.tasks.push({
      text: x.task.text,
      completedDate: x.task.completedDate ?? '',
      timeSpentMs: x.task.timeSpentMs
    })
    g.totalTimeMs += x.task.timeSpentMs
    byProjectDetail.set(x.task.projectId, g)
  }
  const worked = [...byProjectDetail.values()].sort((a, b) => b.tasks.length - a.tasks.length)

  const projectProgress = state.projects.map((p) => {
    const { done, total, pct } = projectProgressOf(state, p.id)
    return { id: p.id, name: p.name, done, total, pct }
  })

  // --- constancia: últimos 14 días desde los cierres de día ---
  const consistency: Summary['consistency'] = []
  for (let i = 13; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    const snap = state.snapshots.find((s) => s.date === iso)
    consistency.push({ date: iso, rate: snap?.completionRate ?? 0, hasData: !!snap })
  }

  const rates = state.snapshots.filter((s) => inWin(s.date, from, to) && s.totalTasks > 0)
  const closeRate = rates.length ? rates.reduce((a, s) => a + s.completionRate, 0) / rates.length : null

  const activeDays = new Set(cur.map((x) => x.day)).size

  // --- horas del día, mejor/peor día, promedios y perfil ---
  const hourCounts = Array.from({ length: 24 }, () => 0)
  for (const x of cur) hourCounts[x.hour] += 1
  const hourly = hourCounts.map((count, hour) => ({
    hour,
    count,
    avgPerActiveDay: activeDays === 0 ? 0 : count / activeDays
  }))
  const peak = peakWindow(hourCounts)

  const ranked = weekday.filter((w) => w.occurrences > 0)
  const enough = days >= 7 && cur.length >= 5
  const bestW = enough ? [...ranked].sort((a, b) => b.avg - a.avg)[0] : undefined
  const worstW = enough ? [...ranked].sort((a, b) => a.avg - b.avg)[0] : undefined
  const bestDay = bestW && bestW.avg > 0 ? { label: bestW.label, avg: bestW.avg } : null
  const worstDay =
    worstW && bestW && worstW.dow !== bestW.dow ? { label: worstW.label, avg: worstW.avg } : null

  const averages = {
    perCalendarDay: cur.length / days,
    perActiveDay: activeDays === 0 ? 0 : cur.length / activeDays,
    perWeek: days >= 7 ? cur.length / (days / 7) : null,
    timePerActiveDayMs: activeDays === 0 || totalTime === 0 ? null : totalTime / activeDays
  }

  // racha más larga de días seguidos con tareas cerradas dentro del período
  const activeSet = new Set(cur.map((x) => x.day))
  let maxRun = 0
  let run = 0
  for (let i = 0; i < days; i++) {
    if (activeSet.has(addDaysISO(from, i))) {
      run++
      if (run > maxRun) maxRun = run
    } else run = 0
  }
  const perDayCount = new Map<string, number>()
  for (const x of cur) perDayCount.set(x.day, (perDayCount.get(x.day) ?? 0) + 1)

  const profileInput: ProfileInput = {
    completed: cur.length,
    days,
    activeDays,
    hourly: hourCounts,
    weekdayCounts: weekday.map((w) => w.count),
    timeMs: totalTime,
    trackedCount,
    avgTaskMs: trackedCount > 0 ? totalTime / trackedCount : null,
    coverage: cur.length === 0 ? 0 : trackedCount / cur.length,
    created: createdIn(from, to),
    backlogLoose: backlog.loose,
    maxRun,
    maxInDay: Math.max(0, ...perDayCount.values()),
    topProjectShare: byProject[0]?.taskShare ?? 0,
    projectsUsed: byProject.filter((p) => p.id !== null).length,
    hasProjects: state.projects.length > 0
  }
  const profile = buildProfile(profileInput)
  const recommendations = buildRecommendations(profileInput, profile)

  const summary: Summary = {
    period,
    rangeLabel: days === 1 ? (to === today ? 'Hoy' : fmtDay(from)) : `${fmtDay(from)} – ${fmtDay(to)}`,
    days,
    completed: { value: cur.length, prev: hasPrev ? prev.length : null },
    timeMs: { value: totalTime, prev: hasPrev ? sumTime(prev) : null },
    created: { value: createdIn(from, to), prev: hasPrev ? createdIn(prevFrom, prevTo) : null },
    trackedCount,
    avgTaskMs: trackedCount > 0 ? totalTime / trackedCount : null,
    coverage: cur.length === 0 ? 0 : trackedCount / cur.length,
    activeDays,
    closeRate,
    byProject,
    daily,
    weekday,
    hourly,
    peakWindow: peak,
    bestDay,
    worstDay,
    averages,
    maxRun,
    profile,
    recommendations,
    dayparts,
    longest,
    stuck,
    backlog,
    worked,
    projectProgress,
    consistency,
    streak: { current: state.streak.current, best: state.streak.best },
    suggestions: [],
    completedCount: cur.length,
    totalTimeMs: totalTime
  }
  summary.suggestions = buildSuggestions(state, summary, now)
  return summary
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function trim(s: string, max = 42): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function buildSuggestions(state: PersistedState, s: Summary, now: Date): Suggestion[] {
  const nudges: Suggestion[] = []
  const wins: Suggestion[] = []
  const info: Suggestion[] = []
  const periodName = s.period === 'custom' ? 'esas fechas' : PERIOD_LABEL[s.period].toLowerCase()
  const today = toISODate(now)

  // 1. una tarea que lleva días rodando
  const stuck = s.stuck.find((t) => t.daysRolled >= 3)
  if (stuck) {
    nudges.push({
      tone: 'nudge',
      text: `«${trim(stuck.text)}» lleva ${stuck.daysRolled} días rodando. ¿La partes en algo más chico o la sueltas?`
    })
  }

  // 2. frente al período anterior
  if (s.completed.prev !== null && s.completed.prev > 0) {
    const change = (s.completed.value - s.completed.prev) / s.completed.prev
    if (change >= 0.15) {
      wins.push({
        tone: 'win',
        text: `Cerraste ${pct(change)} más tareas que en el período anterior (${s.completed.value} frente a ${s.completed.prev}).`
      })
    } else if (change <= -0.25) {
      nudges.push({
        tone: 'nudge',
        text: `Cerraste ${pct(-change)} menos tareas que en el período anterior (${s.completed.value} frente a ${s.completed.prev}).`
      })
    }
  }

  // 3. tasa de cierre de días, esta semana vs la anterior
  const rate = (fromDays: number, toDays: number): number | null => {
    const xs: number[] = []
    for (let i = fromDays; i < toDays; i++) {
      const snap = state.snapshots.find((sn) => sn.date === addDaysISO(today, -i))
      if (snap) xs.push(snap.completionRate)
    }
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  }
  const thisWeek = rate(0, 7)
  const lastWeek = rate(7, 14)
  if (thisWeek !== null && lastWeek !== null && lastWeek - thisWeek > 0.15) {
    nudges.push({
      tone: 'nudge',
      text: 'Esta semana cerraste menos días completos que la anterior. ¿Menos tareas por día?'
    })
  }

  // 4. a qué proyecto se fue el tiempo / las tareas
  const byTime = [...s.byProject].sort((a, b) => b.timeMs - a.timeMs)
  const topTime = byTime[0]
  const topTasks = s.byProject[0]
  if (topTime && topTime.timeMs > 0) {
    info.push({
      tone: 'info',
      text: `Tu tiempo se fue sobre todo en ${trim(topTime.name, 36)}: ${pct(topTime.timeShare)} (${formatDurationLong(topTime.timeMs)}).`
    })
    if (topTasks && topTasks.id !== topTime.id && topTasks.tasks > topTime.tasks) {
      info.push({
        tone: 'info',
        text: `${trim(topTasks.name, 36)} fue donde más tareas cerraste (${topTasks.tasks}), pero ${trim(topTime.name, 36)} se llevó más tiempo.`
      })
    }
  } else if (topTasks && s.completed.value >= 2) {
    info.push({
      tone: 'info',
      text: `Donde más cerraste fue ${trim(topTasks.name, 36)}: ${plural(topTasks.tasks, 'tarea', 'tareas')} (${pct(topTasks.taskShare)}).`
    })
  }

  // 5. lo que no tiene proyecto
  const loneShare = s.byProject.find((p) => p.id === null)?.taskShare ?? 0
  if (state.projects.length > 0 && s.completed.value >= 4 && loneShare >= 0.4) {
    nudges.push({
      tone: 'nudge',
      text: `El ${pct(loneShare)} de lo que cerraste no tiene proyecto. Etiquétalo y verás mejor a qué le dedicas el tiempo.`
    })
  }

  // 6. cronómetro poco usado
  if (s.completed.value >= 4 && s.coverage < 0.3) {
    nudges.push({
      tone: 'nudge',
      text: `Solo ${s.trackedCount} de ${s.completed.value} tareas tienen tiempo medido. Dale ▶ al empezar y verás cuánto te toma cada cosa.`
    })
  }

  // 7. cuándo rindes más
  if (s.completed.value >= 5) {
    const bestDay = [...s.weekday].sort((a, b) => b.count - a.count)[0]
    if (s.days >= 7 && bestDay.count > 0) {
      info.push({
        tone: 'info',
        text: `Tu día más productivo: ${bestDay.label} (${plural(bestDay.count, 'tarea', 'tareas')}).`
      })
    }
    const bestPart = [...s.dayparts].sort((a, b) => b.count - a.count)[0]
    if (bestPart.count / s.completed.value >= 0.4) {
      info.push({
        tone: 'info',
        text: `Cierras más tareas ${bestPart.id === 'noche' ? 'de noche' : bestPart.id === 'manana' ? 'por la mañana' : bestPart.id === 'tarde' ? 'por la tarde' : 'de madrugada'} (${pct(bestPart.count / s.completed.value)}).`
      })
    }
  }

  // 8. la más larga
  const longest = s.longest[0]
  if (longest && longest.timeMs >= 30 * 60_000) {
    info.push({
      tone: 'info',
      text: `La tarea que más tiempo te llevó: «${trim(longest.text)}» (${formatDurationLong(longest.timeMs)}).`
    })
  }

  // 9. tiempo promedio
  if (s.trackedCount >= 2 && s.avgTaskMs !== null) {
    info.push({
      tone: 'info',
      text: `Promedio por tarea con cronómetro: ${formatDurationLong(s.avgTaskMs)} (${s.trackedCount} tareas).`
    })
  }

  // 10. pendientes sueltas acumuladas
  if (s.backlog.loose >= 8) {
    nudges.push({
      tone: 'nudge',
      text: `Tienes ${s.backlog.loose} tareas sin día. Asigna las próximas a un día para que no se acumulen.`
    })
  }

  // 11. proyecto sin movimiento
  for (const p of state.projects) {
    const mine = [...state.tasks, ...state.archivedTasks].filter((t) => t.projectId === p.id)
    if (mine.length === 0 || mine.every((t) => t.done)) continue
    const lastCreated = mine
      .map((t) => t.createdDate)
      .sort()
      .at(-1)
    if (lastCreated && daysBetween(lastCreated, today) > 5) {
      info.push({
        tone: 'info',
        text: `${trim(p.name)} no tiene movimiento hace ${daysBetween(lastCreated, today)} días.`
      })
    }
  }

  // 12. racha y constancia
  if (state.streak.current >= 3) {
    wins.push({
      tone: 'win',
      text: `Racha de ${state.streak.current} días. Vas en buen ritmo, no la sueltes.`
    })
  }
  if (s.closeRate !== null && s.days >= 3 && s.closeRate >= 0.8) {
    wins.push({
      tone: 'win',
      text: `Cierras en promedio el ${pct(s.closeRate)} de las tareas de tu día. Muy buen cierre.`
    })
  }
  if (s.days >= 7 && s.activeDays > 0) {
    info.push({
      tone: 'info',
      text: `Trabajaste ${s.activeDays} de ${s.days} días en este período.`
    })
  }

  // 13. refuerzo simple si cerró cosas y no hay otra cosa que decir
  if (s.completed.value > 0 && nudges.length === 0 && wins.length === 0) {
    wins.push({
      tone: 'win',
      text: `${plural(s.completed.value, 'tarea cerrada', 'tareas cerradas')} en ${periodName}. Bien.`
    })
  }

  if (s.completed.value === 0 && nudges.length === 0) {
    info.push({
      tone: 'info',
      text: `Sin tareas cerradas en ${periodName} todavía. Empieza por una.`
    })
  }

  return [...nudges, ...wins, ...info].slice(0, 7)
}
