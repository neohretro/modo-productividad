import { useMemo, useState } from 'react'
import { ArrowRight, ClipboardList, Flame, Inbox, Snowflake } from 'lucide-react'
import { toISODate, weekdayShortES } from '@shared/date'
import { looseTasks, scheduledAhead, todayList } from '@shared/tasks'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from '../components/ProgressRing'
import TaskList from '../components/TaskList'
import AddTask from '../components/AddTask'
import ProjectPicker from '../components/ProjectPicker'
import MultitaskNudge from '../components/MultitaskNudge'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Aún despierto'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Today(): React.JSX.Element {
  const tasks = useAppStore((s) => s.tasks)
  const projects = useAppStore((s) => s.projects)
  const streak = useAppStore((s) => s.streak)
  const snapshots = useAppStore((s) => s.snapshots)
  const addTask = useAppStore((s) => s.addTask)
  const setFlash = useAppStore((s) => s.setFlash)
  const setScreen = useAppStore((s) => s.setScreen)
  // Etiqueta de proyecto con la que se crean las tareas nuevas (opcional), una por columna.
  const [todayLabel, setTodayLabel] = useState<string | null>(null)
  const [looseLabel, setLooseLabel] = useState<string | null>(null)

  // "Hoy" = todas las tareas con día asignado hoy o antes (de cualquier proyecto).
  const todayTasks = useMemo(() => todayList({ tasks }), [tasks])
  // "Todas las tareas" = lo que todavía no está en Hoy: sueltas y programadas a futuro.
  const loose = useMemo(() => looseTasks({ tasks }), [tasks])
  const ahead = useMemo(() => scheduledAhead({ tasks }).filter((t) => !t.done), [tasks])

  const total = todayTasks.length
  const done = todayTasks.filter((t) => t.done).length
  const pending = total - done
  const pct = total === 0 ? 0 : done / total
  const focusingCount = todayTasks.filter((t) => t.focusStartedAt !== null && !t.done).length
  const last7 = buildLast7(snapshots)
  const otherCount = loose.length + ahead.length

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
      {/* resumen del día — una sola franja compacta para dejarle el espacio a las listas */}
      <section className="glass relative flex shrink-0 items-center gap-5 overflow-hidden rounded-card py-3 pl-5 pr-6">
        <span className="absolute right-0 top-0 h-7 w-7 rounded-bl-[16px] border-b border-l border-orange/50 bg-orange-glow" />

        <div className="min-w-0 shrink-0">
          <h1 className="text-xl leading-tight">{greeting()}.</h1>
          <p className="text-xs capitalize text-paper-dim">
            {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <span className="mx-1 h-12 w-px shrink-0 bg-border" aria-hidden />

        <div className="relative shrink-0">
          <div className="ring-halo pointer-events-none absolute inset-0" />
          <ProgressRing pct={pct} size={92} stroke={5} label="del día" sub={`${done} de ${total}`} />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-paper-dim">Completadas</p>
            <p className="font-display text-2xl leading-none tabular-nums">
              {done}
              <span className="text-base text-paper-dim"> / {total}</span>
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-paper-dim">Racha</p>
            <p className="flex items-center gap-1.5 font-display text-2xl leading-none tabular-nums">
              <Flame
                size={18}
                strokeWidth={2}
                className={streak.current > 0 ? 'text-orange' : 'text-paper-dim'}
              />
              {streak.current}
            </p>
            <p className="mt-1 flex items-center gap-2 text-[10px] text-paper-dim">
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

          <div className="hidden min-[1000px]:block">
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-paper-dim">
              Últimos 7 días
            </p>
            <div className="flex h-9 w-36 items-end gap-1.5">
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
      </section>

      {/* dos columnas: lo de hoy  |  todo lo demás */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {/* HOY */}
        <section className="glass flex min-h-0 min-w-0 flex-col rounded-card p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="shrink-0 text-base">Hoy</h2>
              {pending > 0 && (
                <span className="shrink-0 rounded-full bg-orange px-2 py-0.5 text-[10px] font-medium tabular-nums text-onaccent">
                  {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
                </span>
              )}
              {focusingCount >= 2 && <MultitaskNudge count={focusingCount} />}
            </div>
            {todayTasks.some((t) => !t.done) && (
              <button
                onClick={copyList}
                title="Copiar la lista de pendientes"
                className="flex shrink-0 items-center gap-1 rounded-chip border border-border-hi px-2 py-1 text-[10px] text-paper-dim transition-colors hover:border-orange hover:text-orange"
              >
                <ClipboardList size={11} strokeWidth={1.75} />
                Copiar
              </button>
            )}
          </div>

          <div className="-mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
            <TaskList
              tasks={todayTasks}
              showRolled
              focusable
              emptyHint="Nada para hoy todavía. Agrega una abajo o trae una desde 'Todas las tareas'."
            />
          </div>

          <div className="mt-3 flex shrink-0 flex-col gap-1.5">
            <AddTask
              onAdd={(t) => addTask(t, { projectId: todayLabel, date: toISODate() })}
              placeholder="¿Qué vas a crear hoy?"
            />
            {projects.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-[10px] text-paper-dim">
                <span>Etiqueta:</span>
                <ProjectPicker value={todayLabel} onChange={setTodayLabel} />
              </div>
            )}
          </div>
        </section>

        {/* TODAS LAS TAREAS (las que no están en Hoy) */}
        <section className="glass flex min-h-0 min-w-0 flex-col rounded-card p-4">
          <div className="mb-2.5 flex items-center gap-2">
            <h2 className="text-base">Todas las tareas</h2>
            {otherCount > 0 && (
              <span className="rounded-full bg-ink-soft px-2 py-0.5 text-[10px] tabular-nums text-paper-dim">
                {otherCount}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-[10px] text-paper-dim">
              lo que aún no está en Hoy
            </span>
            <button
              onClick={() => setScreen('tasks')}
              className="flex shrink-0 items-center gap-1 rounded-chip border border-border-hi px-2 py-1 text-[10px] text-paper-dim transition-colors hover:border-orange hover:text-orange"
            >
              Ver todas
              <ArrowRight size={11} strokeWidth={2} />
            </button>
          </div>

          <div className="-mr-1.5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1.5">
            {otherCount === 0 && (
              <div className="grid place-items-center gap-2 py-10 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-orange-soft text-orange">
                  <Inbox size={18} strokeWidth={1.75} />
                </span>
                <p className="max-w-[16rem] text-xs leading-relaxed text-paper-dim">
                  No tienes tareas pendientes fuera de Hoy. Las que agregues aquí sin día quedan
                  sueltas hasta que las traigas a Hoy o las asignes a un día.
                </p>
              </div>
            )}

            {loose.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-paper-dim">
                  Sin día
                  <span className="rounded-full bg-ink-soft px-1.5 tabular-nums">{loose.length}</span>
                </p>
                <TaskList tasks={loose} showDay quickToday />
              </div>
            )}

            {ahead.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-paper-dim">
                  Programadas
                  <span className="rounded-full bg-ink-soft px-1.5 tabular-nums">{ahead.length}</span>
                </p>
                <TaskList tasks={ahead} showDay quickToday />
              </div>
            )}
          </div>

          <div className="mt-3 flex shrink-0 flex-col gap-1.5">
            <AddTask
              onAdd={(t) => addTask(t, { projectId: looseLabel, date: null })}
              placeholder="Agregar una tarea sin día"
            />
            {projects.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-[10px] text-paper-dim">
                <span>Etiqueta:</span>
                <ProjectPicker value={looseLabel} onChange={setLooseLabel} />
              </div>
            )}
          </div>
        </section>
      </div>
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
