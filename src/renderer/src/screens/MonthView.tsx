import { useMemo, useState } from 'react'
import type { Task } from '@shared/types'
import { buildMonth, canAddOn } from '@shared/calendar'
import { useAppStore } from '../store/useAppStore'
import { DayComposer, DayTask } from '../components/DayParts'

const DOW = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const CHIPS = 2

/**
 * Vista de mes: toda la cuadrícula de un vistazo. Tocas un día para ver sus
 * tareas y agregar una nueva en el panel de la derecha; también puedes soltar
 * ahí una tarea arrastrada (de otro día o de "Sin día asignado").
 */
export default function MonthView({
  anchor,
  dragId,
  setDragId
}: {
  anchor: string
  dragId: string | null
  setDragId: (id: string | null) => void
}): React.JSX.Element {
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const assignDay = useAppStore((s) => s.assignDay)
  const [picked, setPicked] = useState<string | null>(null)

  const cells = useMemo(
    () => buildMonth({ tasks, archivedTasks }, anchor),
    [tasks, archivedTasks, anchor]
  )
  const rows = cells.length / 7
  const selected =
    cells.find((c) => c.iso === picked && c.inMonth) ??
    cells.find((c) => c.isToday && c.inMonth) ??
    cells.find((c) => c.inMonth) ??
    cells[0]

  const dropOn = (iso: string): void => {
    if (dragId && canAddOn(iso)) {
      assignDay(dragId, iso)
      setDragId(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
        <div className="grid shrink-0 grid-cols-7 gap-1.5 px-0.5">
          {DOW.map((d) => (
            <span
              key={d}
              className="text-center text-[10px] font-medium uppercase tracking-wide text-paper-dim"
            >
              {d}
            </span>
          ))}
        </div>
        <div
          className="grid min-h-0 flex-1 grid-cols-7 gap-1.5"
          style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        >
          {cells.map((c) => {
            const droppable = dragId !== null && canAddOn(c.iso)
            const isSel = c.iso === selected.iso
            const pending = c.tasks.filter((t) => !t.done)
            const shown = c.tasks.slice(0, CHIPS)
            return (
              <button
                key={c.iso}
                onClick={() => setPicked(c.iso)}
                onDragOver={(e) => {
                  if (droppable) e.preventDefault()
                }}
                onDrop={() => dropOn(c.iso)}
                className={`glass flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden rounded-chip p-1.5 text-left transition-all duration-200 ease-modo ${
                  isSel ? 'ring-1 ring-orange' : 'hover:border-border-hi'
                } ${c.inMonth ? '' : 'opacity-45'} ${
                  droppable ? 'border-dashed border-orange/50 hover:bg-orange-soft' : ''
                }`}
              >
                <div className="flex shrink-0 items-center justify-between gap-1">
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-medium tabular-nums ${
                      c.isToday
                        ? 'bg-orange text-onaccent'
                        : isSel
                          ? 'bg-orange-soft text-orange'
                          : 'text-paper'
                    }`}
                  >
                    {Number(c.iso.slice(8))}
                  </span>
                  {c.tasks.length > 0 && (
                    <span className="text-[9px] tabular-nums text-paper-dim">
                      {c.isPast || c.isToday ? `${c.doneCount}/${c.tasks.length}` : pending.length}
                    </span>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                  {shown.map((t) => (
                    <Chip key={t.id} task={t} />
                  ))}
                  {c.tasks.length > CHIPS && (
                    <span className="px-1 text-[9px] text-paper-dim">
                      +{c.tasks.length - CHIPS} más
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <aside className="glass flex min-h-0 w-[268px] shrink-0 flex-col rounded-card p-3">
        <div className="mb-2 shrink-0">
          <p className="text-sm first-letter:uppercase">{dayTitle(selected.iso)}</p>
          <p className="text-[10px] text-paper-dim">
            {selected.tasks.length === 0
              ? canAddOn(selected.iso)
                ? 'Día libre'
                : 'Nada completado'
              : `${selected.doneCount} de ${selected.tasks.length} hechas`}
          </p>
        </div>
        <div className="-mr-1 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {selected.tasks.map((t) => (
            <DayTask
              key={t.id}
              task={t}
              onDragStart={() => setDragId(t.id)}
              onDragEnd={() => setDragId(null)}
            />
          ))}
        </div>
        {canAddOn(selected.iso) && <DayComposer key={selected.iso} iso={selected.iso} startOpen />}
      </aside>
    </div>
  )
}

/** Tarea en miniatura dentro de la celda: un punto de estado y el texto cortado. */
function Chip({ task }: { task: Task }): React.JSX.Element {
  return (
    <span
      title={task.text}
      className={`flex min-w-0 items-center gap-1 rounded-[6px] bg-ink-soft px-1 py-0.5 text-[9px] leading-tight ${
        task.done ? 'text-paper-dim line-through' : 'text-paper'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${task.done ? 'bg-orange' : 'border border-border-hi'}`}
      />
      <span className="truncate">{task.text}</span>
    </span>
  )
}

function dayTitle(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}
