import { useMemo } from 'react'
import { CalendarClock, ClipboardList, Flame, Snowflake } from 'lucide-react'
import { TODAY_PROJECT_ID } from '@shared/types'
import { toISODate, weekdayShortES } from '@shared/date'
import { scheduleLabel } from '@shared/schedule'
import { activeProjectFocusTasks } from '@shared/focus'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from '../components/ProgressRing'
import TaskList from '../components/TaskList'
import AddTask from '../components/AddTask'
import MultitaskNudge from '../components/MultitaskNudge'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Aún despierto'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Today(): React.JSX.Element {
  const todayTasks = useAppStore((s) => s.todayTasks)
  const scheduledTasks = useAppStore((s) => s.scheduledTasks)
  const projects = useAppStore((s) => s.projects)
  const streak = useAppStore((s) => s.streak)
  const snapshots = useAppStore((s) => s.snapshots)
  const addTask = useAppStore((s) => s.addTask)
  const unscheduleTask = useAppStore((s) => s.unscheduleTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const setFlash = useAppStore((s) => s.setFlash)

  // Tareas de proyecto en curso: se muestran también aquí (con su etiqueta) para
  // cerrarlas sin salir de Hoy.
  const activeProject = useMemo(() => activeProjectFocusTasks({ projects }), [projects])
  const hoyList = useMemo(() => [...activeProject, ...todayTasks], [activeProject, todayTasks])

  const total = todayTasks.length
  const done = todayTasks.filter((t) => t.done).length
  const pct = total === 0 ? 0 : done / total
  const focusingCount =
    todayTasks.filter((t) => t.focusStartedAt !== null && !t.done).length + activeProject.length
  const last7 = buildLast7(snapshots)

  const copyList = (): void => {
    const lines = todayTasks
      .filter((t) => !t.done)
      .map((t) => `- ${t.text}`)
      .join('\n')
    if (!lines) return
    navigator.clipboard?.writeText(lines).catch(() => undefined)
    setFlash('Lista copiada')
  }

  return (
    <div className="stagger flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* bienvenida */}
      <section className="glass relative shrink-0 overflow-hidden rounded-card px-5 py-3.5">
        <span className="absolute right-0 top-0 h-8 w-8 rounded-bl-[18px] border-b border-l border-orange/50 bg-orange-glow" />
        <h1 className="text-xl leading-tight">{greeting()}.</h1>
        <p className="text-xs capitalize text-paper-dim">
          {new Date().toLocaleDateString('es', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </p>
      </section>

      {/* fila de métricas — altura fija */}
      <div className="grid shrink-0 grid-cols-12 gap-3" style={{ height: 208 }}>
        <section className="glass-strong relative col-span-5 grid place-items-center overflow-hidden rounded-card">
          <div className="ring-halo pointer-events-none absolute inset-0" />
          <ProgressRing
            pct={pct}
            size={176}
            stroke={7}
            label="del día"
            sub={`${done} de ${total || 0}`}
          />
        </section>

        <div className="col-span-7 grid grid-cols-2 grid-rows-[1fr_auto] gap-3">
          <div className="glass flex flex-col justify-between rounded-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-paper-dim">Completadas</p>
            <p className="font-display text-3xl leading-none tabular-nums">
              {done}
              <span className="text-lg text-paper-dim"> / {total}</span>
            </p>
          </div>

          <div className="glass flex flex-col justify-between rounded-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-paper-dim">Racha</p>
            <div>
              <p className="flex items-center gap-1.5 font-display text-3xl leading-none tabular-nums">
                <Flame
                  size={20}
                  strokeWidth={2}
                  className={streak.current > 0 ? 'text-orange' : 'text-paper-dim'}
                />
                {streak.current}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-[10px] text-paper-dim">
                <span>mejor {streak.best}</span>
                {streak.freezesAvailable > 0 && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: streak.freezesAvailable }).map((_, i) => (
                      <Snowflake key={i} size={10} strokeWidth={2} />
                    ))}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="glass col-span-2 flex flex-col gap-2 rounded-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-paper-dim">Últimos 7 días</p>
            <div className="flex h-11 items-end gap-1.5">
              {last7.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end rounded-[3px] bg-ink">
                    <div
                      className={`w-full rounded-[3px] ${
                        d.hasData ? (d.isToday ? 'bg-orange' : 'bg-orange/55') : 'bg-transparent'
                      }`}
                      style={{ height: d.hasData ? `${Math.max(8, d.rate * 100)}%` : '100%' }}
                      title={`${d.date} · ${d.hasData ? Math.round(d.rate * 100) + '%' : 'sin datos'}`}
                    />
                  </div>
                  <span className="text-[8px] uppercase text-paper-dim">
                    {weekdayShortES(d.date).slice(0, 1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* lista de hoy — ocupa el resto, scroll interno */}
      <section className="glass flex min-h-0 flex-1 flex-col rounded-card p-5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-base">Hoy</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-paper-dim">lista continua</span>
            {todayTasks.some((t) => !t.done) && (
              <button
                onClick={copyList}
                title="Copiar la lista de pendientes"
                className="flex items-center gap-1 rounded-chip border border-border-hi px-2 py-1 text-[10px] text-paper-dim transition-colors hover:border-orange hover:text-orange"
              >
                <ClipboardList size={11} strokeWidth={1.75} />
                Copiar lista
              </button>
            )}
          </div>
        </div>
        {focusingCount >= 2 && (
          <div className="mb-2.5">
            <MultitaskNudge count={focusingCount} />
          </div>
        )}
        <div className="-mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
          <TaskList
            tasks={hoyList}
            showRolled
            focusable
            emptyHint="Sin tareas hoy. Agrega la primera abajo."
          />

          {scheduledTasks.length > 0 && (
            <div className="mt-3 border-t border-border pt-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-paper-dim">
                <CalendarClock size={11} strokeWidth={1.75} />
                Programadas ({scheduledTasks.length})
              </p>
              <ul className="flex flex-col gap-1">
                {[...scheduledTasks]
                  .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''))
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 rounded-chip border border-border bg-ink-soft px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 select-text truncate text-paper-dim">
                        {t.text}
                      </span>
                      <span className="shrink-0 rounded-full bg-orange-soft px-2 py-0.5 text-[10px] capitalize text-orange">
                        {t.scheduledDate ? scheduleLabel(t.scheduledDate) : ''}
                      </span>
                      <button
                        onClick={() => unscheduleTask(t.id)}
                        className="shrink-0 text-[10px] text-paper-dim hover:text-paper"
                        title="Traer a Hoy ahora"
                      >
                        a Hoy
                      </button>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="shrink-0 text-paper-dim hover:text-orange"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-3 shrink-0">
          <AddTask onAdd={(t) => addTask(t, TODAY_PROJECT_ID)} placeholder="¿Qué vas a crear hoy?" />
        </div>
      </section>
    </div>
  )
}

function buildLast7(
  snapshots: { date: string; completionRate: number }[]
): { date: string; rate: number; isToday: boolean; hasData: boolean }[] {
  const today = toISODate()
  const out: { date: string; rate: number; isToday: boolean; hasData: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = toISODate(d)
    const snap = snapshots.find((s) => s.date === iso)
    out.push({
      date: iso,
      rate: snap ? snap.completionRate : 0,
      isToday: iso === today,
      hasData: !!snap
    })
  }
  return out
}
