import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { dayMessage } from '@shared/game'
import { toISODate } from '@shared/date'
import { todayList } from '@shared/tasks'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from '../components/ProgressRing'
import TaskList from '../components/TaskList'
import TaskBoard from '../components/TaskBoard'
import AddTask from '../components/AddTask'
import ProjectPicker from '../components/ProjectPicker'
import MultitaskNudge from '../components/MultitaskNudge'
import GameChips, { useGame } from '../components/GameChips'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Aún despierto'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/**
 * Inicio. Dos columnas y nada más: a la izquierda lo que haces HOY, a la derecha
 * TODAS tus otras tareas (con un botón "Hoy" para traerlas). Arriba, una franja
 * corta con el avance del día y tu nivel.
 */
export default function Today(): React.JSX.Element {
  const tasks = useAppStore((s) => s.tasks)
  const projects = useAppStore((s) => s.projects)
  const addTask = useAppStore((s) => s.addTask)
  const setFlash = useAppStore((s) => s.setFlash)
  const [label, setLabel] = useState<string | null>(null)
  const game = useGame()

  // "Hoy" = todas las tareas con día asignado hoy o antes (de cualquier proyecto).
  const todayTasks = useMemo(() => todayList({ tasks }), [tasks])

  const total = todayTasks.length
  const done = todayTasks.filter((t) => t.done).length
  const pending = total - done
  const pct = total === 0 ? 0 : done / total
  const focusingCount = todayTasks.filter((t) => t.focusStartedAt !== null && !t.done).length

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
      {/* franja: saludo y mensaje · nivel y días seguidos · avance del día */}
      <section className="glass relative flex shrink-0 items-center gap-5 overflow-hidden rounded-card py-3 pl-5 pr-6">
        <span className="absolute right-0 top-0 h-7 w-7 rounded-bl-[16px] border-b border-l border-orange/50 bg-orange-glow" />

        <div className="min-w-0 flex-1">
          <h1 className="text-xl leading-tight">{greeting()}.</h1>
          <p className="truncate text-xs text-paper-dim">{dayMessage(game, pending, total)}</p>
        </div>

        <GameChips g={game} />

        <div className="relative shrink-0">
          <div className="ring-halo pointer-events-none absolute inset-0" />
          <ProgressRing pct={pct} size={100} stroke={5} sub={`${done} de ${total}`} />
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {/* HOY */}
        <section className="glass flex min-h-0 min-w-0 flex-col rounded-card p-4">
          <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="shrink-0 text-base">Hoy</h2>
              {pending > 0 && (
                <span className="shrink-0 rounded-full bg-orange px-2 py-0.5 text-[10px] font-medium tabular-nums text-onaccent">
                  {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
                </span>
              )}
              {focusingCount >= 2 && <MultitaskNudge count={focusingCount} />}
            </div>
            {pending > 0 && (
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
              emptyHint="Nada para hoy todavía. Agrega una abajo o trae una de 'Todas las tareas'."
            />
          </div>

          <div className="mt-3 flex shrink-0 flex-col gap-1.5">
            <AddTask
              onAdd={(t) => addTask(t, { projectId: label, date: toISODate() })}
              placeholder="¿Qué vas a crear hoy?"
            />
            {projects.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-[10px] text-paper-dim">
                <span>Proyecto:</span>
                <ProjectPicker value={label} onChange={setLabel} />
              </div>
            )}
          </div>
        </section>

        {/* TODAS LAS TAREAS */}
        <TaskBoard title="Todas las tareas" filterable compact excludeToday />
      </div>
    </div>
  )
}
