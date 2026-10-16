import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCheck,
  ChevronRight,
  Clock,
  Flame,
  Info,
  Sparkles,
  Timer,
  TrendingDown
} from 'lucide-react'
import {
  buildSummary,
  PERIOD_LABEL,
  type Kpi,
  type Period,
  type ProjectShare,
  type Suggestion,
  type Summary as SummaryData
} from '@shared/insights'
import { formatDurationLong } from '@shared/focus'
import { weekdayShortES } from '@shared/date'
import { useAppStore } from '../store/useAppStore'
import Segmented from '../components/Segmented'
import { Bar, Card } from '../components/SummaryUi'
import {
  AchievementsCard,
  AveragesCard,
  BalanceCard,
  HoursCard,
  LevelCard,
  PartsCard,
  ProfileCard,
  RecommendationsCard,
  WeekCard
} from '../components/SummaryParts'
import { useGame } from '../components/GameChips'

const PERIODS: Period[] = ['today', 'week', 'month', 'all']

export default function Summary(): React.JSX.Element {
  const [period, setPeriod] = useState<Period>('week')
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const projects = useAppStore((s) => s.projects)
  const snapshots = useAppStore((s) => s.snapshots)
  const streak = useAppStore((s) => s.streak)
  const settings = useAppStore((s) => s.settings)
  const game = useGame()

  const sum = useMemo(
    () =>
      buildSummary(
        {
          version: 5,
          tasks,
          archivedTasks,
          projects,
          snapshots,
          streak,
          settings,
          lastRolloverDate: null
        },
        period
      ),
    [tasks, archivedTasks, projects, snapshots, streak, settings, period]
  )

  const empty = sum.completed.value === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-orange-soft text-orange">
            <BarChart3 size={21} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-xl">Resumen</h2>
            <p className="text-xs capitalize text-paper-dim">
              Cómo te fue · {sum.rangeLabel}
            </p>
          </div>
        </div>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((p) => ({ id: p, label: PERIOD_LABEL[p] }))}
        />
      </header>

      {/* lo más importante: 4 números */}
      <div className="grid shrink-0 grid-cols-2 gap-3 min-[1000px]:grid-cols-4">
        <Stat
          Icon={CheckCheck}
          label="Tareas cerradas"
          value={String(sum.completed.value)}
          kpi={sum.completed}
          foot={`${sum.created.value} ${sum.created.value === 1 ? 'nueva' : 'nuevas'} en el período`}
        />
        <Stat
          Icon={Clock}
          label="Tiempo trabajado"
          value={sum.timeMs.value > 0 ? formatDurationLong(sum.timeMs.value) : '—'}
          kpi={sum.timeMs}
          foot={
            sum.trackedCount > 0
              ? `en ${sum.trackedCount} ${sum.trackedCount === 1 ? 'tarea medida' : 'tareas medidas'}`
              : 'dale ▶ a una tarea para medirlo'
          }
        />
        <Stat
          Icon={Timer}
          label="Promedio por tarea"
          value={sum.avgTaskMs !== null ? formatDurationLong(sum.avgTaskMs) : '—'}
          foot={sum.avgTaskMs !== null ? 'solo tareas con cronómetro' : 'aún sin datos'}
        />
        <Stat
          Icon={Flame}
          label="Días con tareas hechas"
          value={`${sum.activeDays} de ${sum.days}`}
          foot={
            sum.streak.current > 0
              ? `racha de ${sum.streak.current} ${sum.streak.current === 1 ? 'día' : 'días'}`
              : sum.closeRate !== null
                ? `cierras el ${Math.round(sum.closeRate * 100)}% de tu día`
                : 'constancia del período'
          }
        />
      </div>

      {empty && (
        <Card>
          <p className="py-4 text-center text-sm text-paper-dim">
            Todavía no hay tareas cerradas en este período. Cuando completes algunas, aquí verás en
            qué proyecto trabajas más, cuánto tiempo le dedicas, tus mejores días y más.
          </p>
        </Card>
      )}

      <LevelCard />

      {/* lo que vale la pena saber */}
      <Card title="Lo que vale la pena saber" hint="observaciones sobre tus propios datos">
        <ul className="grid gap-2.5 min-[1000px]:grid-cols-2">
          {sum.suggestions.map((s, i) => (
            <SuggestionRow key={i} s={s} />
          ))}
        </ul>
      </Card>

      {!empty && (
        <>
          <div className="grid gap-4 min-[1000px]:grid-cols-12">
            <div className="min-[1000px]:col-span-7">
              <ProjectsCard sum={sum} />
            </div>
            <div className="min-[1000px]:col-span-5">
              <DailyCard sum={sum} />
            </div>
          </div>

          <div className="grid gap-4 min-[1000px]:grid-cols-2">
            <ProfileCard sum={sum} />
            <RecommendationsCard sum={sum} />
          </div>

          <HoursCard sum={sum} />

          <div className="grid gap-4 min-[1000px]:grid-cols-3">
            <WeekCard sum={sum} />
            <PartsCard sum={sum} />
            <AveragesCard sum={sum} />
          </div>

          <div className="grid gap-4 min-[1000px]:grid-cols-2">
            <BalanceCard sum={sum} />
            <LongestCard sum={sum} />
          </div>
        </>
      )}

      <PendingCard sum={sum} />

      {sum.worked.length > 0 && <WorkedCard sum={sum} />}

      {sum.projectProgress.length > 0 && (
        <Card title="Avance de cada proyecto" hint="acumulado: nunca se reinicia">
          <div className="flex flex-col gap-3">
            {sum.projectProgress.map((p) => (
              <div key={p.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-paper">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-paper-dim">
                    {p.done} de {p.total} · {Math.round(p.pct * 100)}%
                  </span>
                </div>
                <Bar pct={p.pct} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {sum.consistency.some((d) => d.hasData) && (
        <Card title="Cierre de tus días" hint="qué tanto de tu lista de cada día terminaste · 14 días">
          <div className="flex h-20 items-end gap-1">
            {sum.consistency.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm ${d.hasData ? 'bg-orange/70' : 'bg-ink'}`}
                  style={{ height: `${Math.max(4, d.rate * 100)}%` }}
                  title={`${d.date} · ${d.hasData ? Math.round(d.rate * 100) + '%' : 'sin datos'}`}
                />
                <span className="text-[8px] text-paper-dim">{weekdayShortES(d.date).slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AchievementsCard list={game.achievements} />
    </div>
  )
}

/* ---------- piezas ---------- */

/** Cambio frente al período anterior: ▲ 25% / ▼ 10% / nuevo. */
function Delta({ kpi }: { kpi: Kpi }): React.JSX.Element | null {
  if (kpi.prev === null || (kpi.prev === 0 && kpi.value === 0)) return null
  if (kpi.prev === 0) {
    return <span className="rounded-full bg-orange-soft px-1.5 py-0.5 text-[10px] text-orange">nuevo</span>
  }
  const change = (kpi.value - kpi.prev) / kpi.prev
  if (Math.abs(change) < 0.02) {
    return <span className="rounded-full bg-ink-soft px-1.5 py-0.5 text-[10px] text-paper-dim">igual</span>
  }
  const up = change > 0
  const Arrow = up ? ArrowUp : ArrowDown
  return (
    <span
      title="Frente al período anterior de la misma duración"
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
        up ? 'bg-orange-soft text-orange' : 'bg-ink-soft text-paper-dim'
      }`}
    >
      <Arrow size={9} strokeWidth={2.75} />
      {Math.round(Math.abs(change) * 100)}%
    </span>
  )
}

function Stat({
  Icon,
  label,
  value,
  kpi,
  foot
}: {
  Icon: typeof Clock
  label: string
  value: string
  kpi?: Kpi
  foot: string
}): React.JSX.Element {
  return (
    <section className="glass flex flex-col gap-2 rounded-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] text-paper-dim">
          <Icon size={13} strokeWidth={1.75} className="text-orange" />
          {label}
        </span>
        {kpi && <Delta kpi={kpi} />}
      </div>
      <p className="font-display text-3xl leading-none tabular-nums">{value}</p>
      <p className="text-[11px] leading-snug text-paper-dim">{foot}</p>
    </section>
  )
}

function SuggestionRow({ s }: { s: Suggestion }): React.JSX.Element {
  const Icon = s.tone === 'nudge' ? TrendingDown : s.tone === 'win' ? Sparkles : Info
  return (
    <li className="flex items-start gap-2.5 rounded-chip bg-ink-soft px-3 py-2.5 text-sm">
      <Icon
        size={15}
        strokeWidth={1.75}
        className={`mt-0.5 shrink-0 ${s.tone === 'info' ? 'text-paper-dim' : 'text-orange'}`}
      />
      <span className="text-paper">{s.text}</span>
    </li>
  )
}

/* ---------- a qué proyecto dedicaste más ---------- */

function ProjectsCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const hasTime = sum.timeMs.value > 0
  const [by, setBy] = useState<'tasks' | 'time'>('tasks')
  const mode = by === 'time' && hasTime ? 'time' : 'tasks'

  const rows = [...sum.byProject]
    .sort((a, b) => (mode === 'time' ? b.timeMs - a.timeMs : b.tasks - a.tasks))
    .filter((p) => (mode === 'time' ? p.timeMs > 0 : true))
  const max = Math.max(1, ...rows.map((p) => (mode === 'time' ? p.timeMs : p.tasks)))

  return (
    <Card title="¿A qué proyecto le dedicaste más?">
      <div className="mb-3">
        <Segmented<'tasks' | 'time'>
          value={mode}
          onChange={setBy}
          options={[
            { id: 'tasks', label: 'Por tareas' },
            ...(hasTime ? [{ id: 'time' as const, label: 'Por tiempo' }] : [])
          ]}
        />
      </div>
      <ul className="flex flex-col gap-3">
        {rows.slice(0, 8).map((p, i) => (
          <ProjectRow key={p.id ?? 'none'} p={p} mode={mode} max={max} first={i === 0} />
        ))}
      </ul>
      {rows.length > 8 && (
        <p className="mt-2 text-[10px] text-paper-dim">y {rows.length - 8} más con menos actividad</p>
      )}
    </Card>
  )
}

function ProjectRow({
  p,
  mode,
  max,
  first
}: {
  p: ProjectShare
  mode: 'tasks' | 'time'
  max: number
  first: boolean
}): React.JSX.Element {
  const value = mode === 'time' ? p.timeMs : p.tasks
  const share = mode === 'time' ? p.timeShare : p.taskShare
  return (
    <li>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-paper" title={p.name}>
          {p.name}
        </span>
        <span className="shrink-0 tabular-nums text-paper-dim">
          {mode === 'time'
            ? formatDurationLong(p.timeMs)
            : `${p.tasks} ${p.tasks === 1 ? 'tarea' : 'tareas'}`}
          <span className="ml-2 text-paper">{Math.round(share * 100)}%</span>
        </span>
      </div>
      <Bar pct={value / max} strong={first} />
    </li>
  )
}

/* ---------- actividad por día ---------- */

function DailyCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const max = Math.max(1, ...sum.daily.map((d) => d.count))
  const n = sum.daily.length
  const labelEvery = n <= 14 ? 1 : n <= 31 ? 5 : 10
  return (
    <Card title="Tareas cerradas por día" hint={`últimos ${n} días`}>
      <div className="flex h-36 items-end gap-[3px]">
        {sum.daily.map((d, i) => (
          <div
            key={d.date}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={`${d.date} · ${d.count} ${d.count === 1 ? 'tarea' : 'tareas'}${
              d.timeMs > 0 ? ` · ${formatDurationLong(d.timeMs)}` : ''
            }`}
          >
            {n <= 14 && d.count > 0 && (
              <span className="text-[9px] tabular-nums text-paper-dim">{d.count}</span>
            )}
            <div
              className={`w-full rounded-t-[4px] ${
                d.count === 0 ? 'bg-ink' : d.isToday ? 'bg-orange' : 'bg-orange/60'
              }`}
              style={{ height: d.count === 0 ? '3px' : `${Math.max(8, (d.count / max) * 78)}%` }}
            />
            <span className="h-3 text-[8px] leading-3 text-paper-dim">
              {i % labelEvery === 0 || d.isToday
                ? n <= 14
                  ? weekdayShortES(d.date).slice(0, 1).toUpperCase()
                  : String(Number(d.date.slice(8)))
                : ''}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------- las que más tiempo llevaron ---------- */

function LongestCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const max = Math.max(1, ...sum.longest.map((t) => t.timeMs))
  return (
    <Card title="Las que más tiempo te llevaron" hint="solo tareas con cronómetro">
      {sum.longest.length === 0 ? (
        <p className="text-sm text-paper-dim">
          Dale ▶ a una tarea cuando empieces y aquí verás cuáles te toman más tiempo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sum.longest.map((t, i) => (
            <li key={i}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-paper" title={t.text}>
                  {t.text}
                </span>
                <span className="shrink-0 tabular-nums text-paper">{formatDurationLong(t.timeMs)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Bar pct={t.timeMs / max} strong={i === 0} />
                </div>
                <span className="max-w-[9rem] shrink-0 truncate text-[10px] text-paper-dim">
                  {t.projectName}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ---------- pendientes ---------- */

function PendingCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const b = sum.backlog
  const items = [
    { label: 'Pendientes de hoy', n: b.today },
    { label: 'Sin día asignado', n: b.loose },
    { label: 'Con día (por venir)', n: b.planned }
  ]
  return (
    <Card title="Lo que tienes pendiente">
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-chip bg-ink-soft px-3 py-2.5">
            <p className="font-display text-2xl leading-none tabular-nums">{it.n}</p>
            <p className="mt-1 text-[11px] text-paper-dim">{it.label}</p>
          </div>
        ))}
      </div>
      {sum.stuck.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-paper-dim">
            Llevan días sin cerrarse
          </p>
          <ul className="flex flex-col gap-1.5">
            {sum.stuck.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-chip border border-border px-3 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate text-paper" title={t.text}>
                  {t.text}
                </span>
                <span className="shrink-0 rounded-full bg-orange-soft px-2 py-0.5 text-[10px] tabular-nums text-orange">
                  {t.daysRolled} días
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/* ---------- en qué trabajaste (detalle) ---------- */

function WorkedCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (key: string): void =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <Card title="En qué trabajaste" hint="toca un proyecto para ver sus tareas">
      <div className="flex flex-col gap-1.5">
        {sum.worked.map((g) => {
          const key = g.projectId ?? 'none'
          const isOpen = open.has(key)
          return (
            <div key={key} className="rounded-chip border border-border">
              <button
                onClick={() => toggle(key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                <ChevronRight
                  size={13}
                  strokeWidth={2}
                  className={`shrink-0 text-paper-dim transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-paper">{g.projectName}</span>
                <span className="shrink-0 text-xs text-paper-dim">
                  {g.tasks.length} {g.tasks.length === 1 ? 'tarea' : 'tareas'}
                  {g.totalTimeMs > 0 && ` · ${formatDurationLong(g.totalTimeMs)}`}
                </span>
              </button>
              {isOpen && (
                <ul className="flex flex-col gap-1 px-3 pb-3">
                  {g.tasks.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-chip bg-ink-soft px-3 py-1.5 text-xs"
                    >
                      <span className="truncate text-paper-dim">{t.text}</span>
                      {t.timeSpentMs > 0 && (
                        <span className="shrink-0 tabular-nums text-paper-dim/80">
                          {formatDurationLong(t.timeSpentMs)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
