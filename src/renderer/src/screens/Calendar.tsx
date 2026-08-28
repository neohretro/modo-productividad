import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PersistedState, Task } from '@shared/types'
import { addDaysISO, toISODate } from '@shared/date'
import { buildWeek, canAddOn, weekOf } from '@shared/calendar'
import { useAppStore } from '../store/useAppStore'
import { useTaskMenu } from '../hooks/useTaskMenu'
import AddTask from '../components/AddTask'

const DOW = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

export default function Calendar(): React.JSX.Element {
  const todayTasks = useAppStore((s) => s.todayTasks)
  const scheduledTasks = useAppStore((s) => s.scheduledTasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const projects = useAppStore((s) => s.projects)
  const addTaskOn = useAppStore((s) => s.addTaskOn)
  const moveTaskToDate = useAppStore((s) => s.moveTaskToDate)
  const [anchor, setAnchor] = useState(() => toISODate())
  const [dragId, setDragId] = useState<string | null>(null)

  const week = useMemo(() => weekOf(anchor), [anchor])
  const cols = useMemo(() => {
    const slice = { todayTasks, scheduledTasks, archivedTasks, projects } as PersistedState
    return buildWeek(slice, week)
  }, [todayTasks, scheduledTasks, archivedTasks, projects, week])
  const label = `${fmt(week[0])} – ${fmt(week[6])}`

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between">
        <h2 className="text-xl">Semana</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAnchor((a) => addDaysISO(a, -7))}
            className="grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:bg-ink-soft hover:text-paper"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <span className="min-w-[128px] text-center text-xs capitalize text-paper-dim">{label}</span>
          <button
            onClick={() => setAnchor((a) => addDaysISO(a, 7))}
            className="grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:bg-ink-soft hover:text-paper"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => setAnchor(toISODate())}
            className="ml-1 rounded-chip border border-border-hi px-3 py-1 text-xs text-paper-dim hover:border-orange hover:text-orange"
          >
            Hoy
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-7 gap-2">
        {cols.map((col, i) => (
          <section
            key={col.iso}
            onDragOver={(e) => {
              if (dragId && canAddOn(col.iso)) e.preventDefault()
            }}
            onDrop={() => {
              if (dragId && canAddOn(col.iso)) {
                moveTaskToDate(dragId, col.iso)
                setDragId(null)
              }
            }}
            className={`glass flex min-h-0 flex-col rounded-chip p-2.5 transition-colors ${
              col.isToday ? 'ring-1 ring-orange' : ''
            } ${dragId && canAddOn(col.iso) ? 'hover:bg-orange-soft' : ''}`}
          >
            <div className="mb-2 flex shrink-0 items-baseline justify-between px-0.5">
              <span
                className={`text-[11px] font-medium uppercase ${
                  col.isToday ? 'text-orange' : 'text-paper-dim'
                }`}
              >
                {DOW[i]} {Number(col.iso.slice(8))}
              </span>
              {col.tasks.length > 0 && (
                <span className="text-[10px] tabular-nums text-paper-dim">
                  {col.doneCount}/{col.tasks.length}
                </span>
              )}
            </div>

            <div className="-mr-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {col.tasks.length === 0 && (
                <p className="px-1 pt-1 text-[10px] text-paper-dim">—</p>
              )}
              {col.tasks.map((t) => (
                <DayTask key={t.id} task={t} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} />
              ))}
            </div>

            {canAddOn(col.iso) && (
              <div className="mt-1.5 shrink-0">
                <AddTask compact placeholder="Agregar" onAdd={(text) => addTaskOn(text, col.iso)} />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function DayTask({
  task,
  onDragStart,
  onDragEnd
}: {
  task: Task
  onDragStart: () => void
  onDragEnd: () => void
}): React.JSX.Element {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const { onContextMenu, menu } = useTaskMenu(task)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      className={`group flex cursor-grab items-start gap-1.5 rounded-[10px] border border-border bg-ink-soft px-1.5 py-1 active:cursor-grabbing ${
        task.done ? 'opacity-60' : ''
      }`}
    >
      {menu}
      <button
        aria-label={task.done ? 'Marcar pendiente' : 'Completar'}
        onClick={() => toggleTask(task.id)}
        className={`mt-px grid h-3.5 w-3.5 shrink-0 place-items-center rounded border ${
          task.done ? 'border-orange bg-orange text-onaccent' : 'border-border-hi'
        }`}
      >
        {task.done && <Check size={9} strokeWidth={3.5} />}
      </button>
      <span
        className={`line-clamp-3 select-text text-[10px] leading-tight ${
          task.done ? 'text-paper-dim line-through' : 'text-paper'
        }`}
      >
        {task.text}
      </span>
    </div>
  )
}

function fmt(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}
