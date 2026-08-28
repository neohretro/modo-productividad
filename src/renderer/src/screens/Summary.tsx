import { useMemo, useState } from 'react'
import { Info, Sparkles, TrendingDown } from 'lucide-react'
import { buildSummary, PERIOD_LABEL, type Period, type Suggestion } from '@shared/insights'
import { formatDurationLong } from '@shared/focus'
import { weekdayShortES } from '@shared/date'
import { useAppStore } from '../store/useAppStore'

const PERIODS: Period[] = ['today', 'week', 'month']

export default function Summary(): React.JSX.Element {
  const [period, setPeriod] = useState<Period>('week')
  const todayTasks = useAppStore((s) => s.todayTasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const projects = useAppStore((s) => s.projects)
  const snapshots = useAppStore((s) => s.snapshots)
  const streak = useAppStore((s) => s.streak)
  const settings = useAppStore((s) => s.settings)

  const summary = useMemo(
    () =>
      buildSummary(
        {
          version: 2,
          todayTasks,
          archivedTasks,
          projects,
          snapshots,
          streak,
          settings,
          lastRolloverDate: null
        },
        period
      ),
    [todayTasks, archivedTasks, projects, snapshots, streak, settings, period]
  )

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
      <header className="flex items-center justify-between">
        <h2 className="text-xl">Resumen</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-chip border px-3 py-1 text-xs transition-colors ease-modo ${
                period === p
                  ? 'border-orange bg-orange-glow text-paper'
                  : 'border-border bg-ink-glass text-paper-dim hover:text-paper'
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </header>

      {/* titular */}
      <section className="glass flex items-center gap-6 rounded-card p-6">
        <div>
          <p className="font-display text-4xl tabular-nums">{summary.completedCount}</p>
          <p className="text-xs text-paper-dim">
            {summary.completedCount === 1 ? 'tarea cerrada' : 'tareas cerradas'}
          </p>
        </div>
        {summary.totalTimeMs > 0 && (
          <div className="border-l border-border pl-6">
            <p className="font-display text-4xl tabular-nums">
              {formatDurationLong(summary.totalTimeMs)}
            </p>
            <p className="text-xs text-paper-dim">con cronómetro ({summary.trackedCount})</p>
          </div>
        )}
      </section>

      {/* en qué trabajaste */}
      <section className="glass rounded-card p-6">
        <h3 className="mb-3 text-sm uppercase tracking-wide text-paper-dim">En qué trabajaste</h3>
        {summary.worked.length === 0 ? (
          <p className="text-sm text-paper-dim">Nada cerrado en {PERIOD_LABEL[period].toLowerCase()}.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {summary.worked.map((g) => (
              <div key={g.projectId}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm text-paper">{g.projectName}</span>
                  <span className="text-xs text-paper-dim">
                    {g.tasks.length} {g.tasks.length === 1 ? 'tarea' : 'tareas'}
                    {g.totalTimeMs > 0 && ` · ${formatDurationLong(g.totalTimeMs)}`}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {g.tasks.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-chip border border-border bg-ink-glass px-3 py-1.5 text-xs"
                    >
                      <span className="truncate text-paper-dim">{t.text}</span>
                      {t.timeSpentMs > 0 && (
                        <span className="shrink-0 pl-2 tabular-nums text-paper-dim/70">
                          {formatDurationLong(t.timeSpentMs)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* progreso por proyecto */}
      {summary.projectProgress.length > 0 && (
        <section className="glass rounded-card p-6">
          <h3 className="mb-3 text-sm uppercase tracking-wide text-paper-dim">
            Progreso por proyecto
          </h3>
          <div className="flex flex-col gap-3">
            {summary.projectProgress.map((p) => (
              <div key={p.id}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="text-paper">{p.name}</span>
                  <span className="tabular-nums text-paper-dim">
                    {p.done}/{p.total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-glass-strong">
                  <div
                    className="h-full rounded-full bg-orange transition-[width] duration-500 ease-modo"
                    style={{ width: `${Math.round(p.pct * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* consistencia */}
      <section className="glass rounded-card p-6">
        <h3 className="mb-3 text-sm uppercase tracking-wide text-paper-dim">
          Consistencia · 14 días
        </h3>
        <div className="flex h-20 items-end gap-1">
          {summary.consistency.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm ${d.hasData ? 'bg-orange/70' : 'bg-ink-glass-strong'}`}
                style={{ height: `${Math.max(4, d.rate * 100)}%` }}
                title={`${d.date} · ${Math.round(d.rate * 100)}%`}
              />
              <span className="text-[8px] text-paper-dim">{weekdayShortES(d.date).slice(0, 1)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* sugerencias */}
      <section className="glass-strong rounded-card p-6">
        <h3 className="mb-3 text-sm uppercase tracking-wide text-paper-dim">Puntos de mejora</h3>
        <ul className="flex flex-col gap-2.5">
          {summary.suggestions.map((s, i) => (
            <SuggestionRow key={i} s={s} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function SuggestionRow({ s }: { s: Suggestion }): React.JSX.Element {
  const Icon = s.tone === 'nudge' ? TrendingDown : s.tone === 'win' ? Sparkles : Info
  const color =
    s.tone === 'nudge' ? 'text-orange' : s.tone === 'win' ? 'text-orange' : 'text-paper-dim'
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <Icon size={15} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${color}`} />
      <span className="text-paper">{s.text}</span>
    </li>
  )
}
