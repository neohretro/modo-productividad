import { useRef, useState } from 'react'
import { CalendarCheck, CalendarClock, CalendarPlus, CalendarX2, Sun } from 'lucide-react'
import type { Task } from '@shared/types'
import { addDaysISO, toISODate } from '@shared/date'
import { dayLabel } from '@shared/tasks'
import { useAppStore } from '../store/useAppStore'
import { ContextMenu, MenuItem, MenuLabel, MenuSep, type MenuPos } from './ContextMenu'

/**
 * Botón para asignar una tarea a un día: "Hoy", "Mañana", otra fecha, o dejarla
 * suelta (sin día). Si ya tiene día, muestra ese día como etiqueta clicable.
 */
export default function AssignDay({
  task,
  className = '',
  compact = false
}: {
  task: Task
  className?: string
  /** si la tarea está suelta, solo muestra el ícono (para columnas angostas). */
  compact?: boolean
}): React.JSX.Element {
  const assignDay = useAppStore((s) => s.assignDay)
  const setFlash = useAppStore((s) => s.setFlash)
  const [pos, setPos] = useState<MenuPos | null>(null)
  const [picking, setPicking] = useState(false)
  const [date, setDate] = useState(addDaysISO(toISODate(), 2))
  const ref = useRef<HTMLButtonElement>(null)
  const loose = task.scheduledDate === null

  const open = (): void => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left, y: r.bottom + 4 })
    setPicking(false)
  }
  const close = (): void => {
    setPos(null)
    setPicking(false)
  }
  const apply = (iso: string | null, msg: string): void => {
    assignDay(task.id, iso)
    setFlash(msg)
    close()
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={open}
        title={loose ? 'Asignar a un día' : 'Cambiar el día'}
        className={`no-drag inline-flex shrink-0 items-center gap-1 rounded-full border text-[10px] transition-colors ${
          loose && compact ? 'h-6 w-6 justify-center' : 'px-2 py-0.5'
        } ${
          loose
            ? 'border-dashed border-border-hi text-paper-dim hover:border-orange hover:text-orange'
            : 'border-orange/40 bg-orange-soft capitalize text-orange hover:bg-orange-glow'
        } ${className}`}
      >
        {loose ? (
          <>
            <CalendarPlus size={compact ? 12 : 10} strokeWidth={2} />
            {!compact && 'Asignar día'}
          </>
        ) : (
          <>
            <CalendarCheck size={10} strokeWidth={2} />
            {dayLabel(task.scheduledDate as string)}
          </>
        )}
      </button>

      {pos && (
        <ContextMenu pos={pos} onClose={close}>
          {!picking ? (
            <>
              <MenuLabel>Asignar a</MenuLabel>
              <MenuItem Icon={Sun} label="Hoy" onClick={() => apply(toISODate(), 'Asignada a hoy')} />
              <MenuItem
                Icon={CalendarPlus}
                label="Mañana"
                onClick={() => apply(addDaysISO(toISODate(), 1), 'Asignada a mañana')}
              />
              <MenuItem Icon={CalendarClock} label="Otra fecha…" onClick={() => setPicking(true)} />
              {!loose && (
                <>
                  <MenuSep />
                  <MenuItem
                    Icon={CalendarX2}
                    label="Quitar el día (suelta)"
                    onClick={() => apply(null, 'Quedó sin día')}
                  />
                </>
              )}
            </>
          ) : (
            <div className="p-1">
              <MenuLabel>Elegir fecha</MenuLabel>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mb-1.5 w-full rounded-[11px] border border-border-hi bg-ink px-2.5 py-1.5 text-xs text-paper outline-none"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPicking(false)}
                  className="flex-1 rounded-[11px] px-2 py-1.5 text-xs text-paper-dim hover:bg-ink-glass"
                >
                  Atrás
                </button>
                <button
                  onClick={() => date && apply(date, 'Día asignado')}
                  className="flex-1 rounded-[11px] bg-orange px-2 py-1.5 text-xs text-onaccent"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </ContextMenu>
      )}
    </>
  )
}
