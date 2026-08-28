import { Flame, Snowflake } from 'lucide-react'
import { TODAY_PROJECT_ID } from '@shared/types'
import { weekdayShortES } from '@shared/date'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from '../components/ProgressRing'
import StatCard from '../components/StatCard'
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
  const streak = useAppStore((s) => s.streak)
  const snapshots = useAppStore((s) => s.snapshots)
  const addTask = useAppStore((s) => s.addTask)

  const total = todayTasks.length
  const done = todayTasks.filter((t) => t.done).length
  const pct = total === 0 ? 0 : done / total
  const focusingCount = todayTasks.filter((t) => t.focusStartedAt !== null && !t.done).length

  const last7 = buildLast7(snapshots)

  return (
    <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
      {/* bienvenida */}
      <section className="glass col-span-12 flex items-center justify-between rounded-card p-6">
        <div>
          <h1 className="text-2xl">{greeting()}.</h1>
          <p className="text-sm capitalize text-paper-dim">
            {new Date().toLocaleDateString('es', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
        <div className="h-6 w-6 rounded-tr-card border-r-2 border-t-2 border-orange" />
      </section>

      {/* anillo + stats */}
      <section className="glass col-span-7 grid place-items-center rounded-card p-6">
        <ProgressRing pct={pct} label="del día" sub={`${done} de ${total || 0}`} />
      </section>

      <div className="col-span-5 flex flex-col gap-4">
        <StatCard label="Tareas completadas" value={`${done} / ${total}`} />
        <StatCard
          label="Racha"
          value={
            <span className="flex items-center gap-2">
              <Flame size={22} strokeWidth={1.75} className={streak.current > 0 ? 'text-orange' : 'text-paper-dim'} />
              {streak.current} {streak.current === 1 ? 'día' : 'días'}
            </span>
          }
          hint={
            <span className="flex items-center gap-3">
              <span>Mejor: {streak.best}</span>
              <span className="flex items-center gap-1">
                {Array.from({ length: streak.freezesAvailable }).map((_, i) => (
                  <Snowflake key={i} size={12} strokeWidth={1.75} className="text-paper-dim" />
                ))}
              </span>
            </span>
          }
        />
        <StatCard label="Últimos 7 días" value="" strong>
          <div className="mt-1 flex h-12 items-end gap-1.5">
            {last7.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-orange/70"
                  style={{ height: `${Math.max(4, d.rate * 100)}%` }}
                  title={`${d.date} · ${Math.round(d.rate * 100)}%`}
                />
                <span className="text-[9px] text-paper-dim">{weekdayShortES(d.date)}</span>
              </div>
            ))}
          </div>
        </StatCard>
      </div>

      {/* lista de hoy */}
      <section className="glass col-span-12 flex min-h-0 flex-1 flex-col rounded-card p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg">Hoy</h2>
          <span className="text-xs text-paper-dim">lista continua · no se reinicia</span>
        </div>
        {focusingCount >= 2 && (
          <div className="mb-3">
            <MultitaskNudge count={focusingCount} />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <TaskList
            tasks={todayTasks}
            showRolled
            focusable
            emptyHint="Sin tareas hoy. Agrega la primera abajo."
          />
        </div>
        <div className="mt-3">
          <AddTask onAdd={(t) => addTask(t, TODAY_PROJECT_ID)} placeholder="¿Qué vas a crear hoy?" />
        </div>
      </section>
    </div>
  )
}

function buildLast7(
  snapshots: { date: string; completionRate: number }[]
): { date: string; rate: number }[] {
  const today = new Date()
  const out: { date: string; rate: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`
    const snap = snapshots.find((s) => s.date === iso)
    out.push({ date: iso, rate: snap ? snap.completionRate : 0 })
  }
  return out
}
