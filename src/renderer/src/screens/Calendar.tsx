import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDaysISO, toISODate } from '@shared/date'
import { buildWeek, canAddOn, shiftMonth, weekOf } from '@shared/calendar'
import { useAppStore } from '../store/useAppStore'
import Segmented from '../components/Segmented'
import { DayComposer, DayTask, LooseChip } from '../components/DayParts'
import MonthView from './MonthView'

const DOW = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

export default function Calendar(): React.JSX.Element {
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const assignDay = useAppStore((s) => s.assignDay)
  const [anchor, setAnchor] = useState(() => toISODate())
  const [dragId, setDragId] = useState<string | null>(null)
  const [trayOpen, setTrayOpen] = useState(true)
  const [mode, setMode] = useState<'week' | 'month'>('week')

  const week = useMemo(() => weekOf(anchor), [anchor])
  const cols = useMemo(
    () => buildWeek({ tasks, archivedTasks }, week),
    [tasks, archivedTasks, week]
  )
  const loose = useMemo(() => tasks.filter((t) => t.scheduledDate === null && !t.done), [tasks])
  const label =
    mode === 'week'
      ? `${fmt(week[0])} – ${fmt(week[6])}`
      : new Date(`${anchor}T00:00:00`).toLocaleDateString('es', {
          month: 'long',
          year: 'numeric'
        })
  const step = (dir: -1 | 1): void =>
    setAnchor((a) => (mode === 'week' ? addDaysISO(a, dir * 7) : shiftMonth(a, dir)))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl">{mode === 'week' ? 'Semana' : 'Mes'}</h2>
          <Segmented<'week' | 'month'>
            value={mode}
            onChange={setMode}
            options={[
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mes' }
            ]}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => step(-1)}
            className="grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:bg-ink-soft hover:text-paper"
            aria-label={mode === 'week' ? 'Semana anterior' : 'Mes anterior'}
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <span
            className={`min-w-[128px] text-center text-xs text-paper-dim ${
              mode === 'week' ? 'capitalize' : 'first-letter:uppercase'
            }`}
          >
            {label}
          </span>
          <button
            onClick={() => step(1)}
            className="grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:bg-ink-soft hover:text-paper"
            aria-label={mode === 'week' ? 'Semana siguiente' : 'Mes siguiente'}
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

      {mode === 'month' ? (
        <MonthView anchor={anchor} dragId={dragId} setDragId={setDragId} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-2">
          {cols.map((col, i) => {
            const droppable = dragId !== null && canAddOn(col.iso)
            const dayNum = Number(col.iso.slice(8))
            return (
              <section
                key={col.iso}
                onDragOver={(e) => {
                  if (droppable) e.preventDefault()
                }}
                onDrop={() => {
                  if (dragId && canAddOn(col.iso)) {
                    assignDay(dragId, col.iso)
                    setDragId(null)
                  }
                }}
                className={`glass flex min-h-0 flex-col rounded-chip p-2 transition-all duration-200 ease-modo ${
                  col.isToday ? 'ring-1 ring-orange' : ''
                } ${droppable ? 'border-dashed border-orange/50 hover:bg-orange-soft' : ''}`}
              >
                <div className="mb-2 flex shrink-0 items-center justify-between px-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-medium tabular-nums ${
                        col.isToday ? 'bg-orange text-onaccent' : 'bg-ink-soft text-paper'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide ${
                        col.isToday ? 'text-orange' : 'text-paper-dim'
                      }`}
                    >
                      {DOW[i]}
                    </span>
                  </div>
                  {col.tasks.length > 0 && (
                    <span className="text-[10px] tabular-nums text-paper-dim">
                      {col.doneCount}/{col.tasks.length}
                    </span>
                  )}
                </div>

                <div className="-mr-1 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {col.tasks.length === 0 && (
                    <p className="px-1 pt-1 text-[10px] text-paper-dim">
                      {col.isPast ? 'Nada completado' : 'Libre'}
                    </p>
                  )}
                  {col.tasks.map((t) => (
                    <DayTask
                      key={t.id}
                      task={t}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))}
                </div>

                {canAddOn(col.iso) && <DayComposer iso={col.iso} />}
              </section>
            )
          })}
        </div>
      )}

      {loose.length > 0 && (
        <section className="glass shrink-0 rounded-chip px-3 py-2">
          <button
            onClick={() => setTrayOpen((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <ChevronDown
              size={13}
              strokeWidth={2}
              className={`shrink-0 text-paper-dim transition-transform ${trayOpen ? '' : '-rotate-90'}`}
            />
            <span className="text-xs text-paper">Sin día asignado</span>
            <span className="rounded-full bg-orange px-1.5 text-[9px] font-medium tabular-nums text-onaccent">
              {loose.length}
            </span>
            <span className="truncate text-[10px] text-paper-dim">Arrástralas a un día</span>
          </button>
          {trayOpen && (
            <div className="mt-2 flex max-h-[78px] flex-wrap gap-1.5 overflow-y-auto pr-1">
              {loose.map((t) => (
                <LooseChip
                  key={t.id}
                  task={t}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function fmt(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short'
  })
}
