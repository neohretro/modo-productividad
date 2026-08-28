import { useState } from 'react'
import {
  ArrowRightLeft,
  Bell,
  BellOff,
  CalendarClock,
  CalendarPlus,
  Copy,
  CopyPlus,
  Pencil,
  Trash2
} from 'lucide-react'
import { TODAY_PROJECT_ID, type Task } from '@shared/types'
import { addDaysISO, toISODate } from '@shared/date'
import { inHoursISO, laterTodayISO, tomorrowAtISO } from '@shared/reminders'
import { useAppStore } from '../store/useAppStore'
import { ContextMenu, MenuItem, MenuLabel, MenuSep, type MenuPos } from './ContextMenu'

/** ISO → "hoy 15:30", "mañana 09:00", "vie 12 · 18:00". */
function formatReminder(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const hh = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const today = toISODate(now)
  const day = toISODate(d)
  if (day === today) return `hoy ${hh}`
  if (day === addDaysISO(today, 1)) return `mañana ${hh}`
  return `${d.toLocaleDateString('es', { weekday: 'short', day: 'numeric' })} · ${hh}`
}

/** value para <input type="datetime-local"> (hora local, sin zona). */
function toLocalInput(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function TaskContextMenu({
  task,
  pos,
  onClose
}: {
  task: Task
  pos: MenuPos
  onClose: () => void
}): React.JSX.Element {
  const s = useAppStore()
  const [mode, setMode] = useState<'root' | 'date' | 'project' | 'remind'>('root')
  const [date, setDate] = useState(addDaysISO(toISODate(), 1))
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 3_600_000)))
  const laterToday = laterTodayISO(18)
  // Las tareas de proyecto no tienen fecha; solo se pueden mover.
  const canSchedule = task.projectId === TODAY_PROJECT_ID

  const done = (fn: () => void, msg?: string): void => {
    fn()
    if (msg) s.setFlash(msg)
    onClose()
  }

  const copy = (): void => {
    navigator.clipboard?.writeText(task.text).catch(() => undefined)
    done(() => undefined, 'Copiado')
  }

  return (
    <ContextMenu pos={pos} onClose={onClose}>
      {mode === 'root' && (
        <>
          <MenuItem
            Icon={Pencil}
            label="Editar"
            onClick={() => done(() => s.setEditingTask(task.id))}
          />
          <MenuItem Icon={Copy} label="Copiar texto" onClick={copy} />
          <MenuItem
            Icon={CopyPlus}
            label="Duplicar"
            onClick={() => done(() => s.duplicateTask(task.id))}
          />
          <MenuSep />
          {canSchedule && (
            <>
              <MenuItem
                Icon={CalendarPlus}
                label="Para mañana"
                onClick={() =>
                  done(
                    () => s.moveTaskToDate(task.id, addDaysISO(toISODate(), 1)),
                    'Movida a mañana'
                  )
                }
              />
              <MenuItem
                Icon={CalendarClock}
                label="Para otra fecha…"
                onClick={() => setMode('date')}
              />
            </>
          )}
          <MenuItem Icon={ArrowRightLeft} label="Mover a…" onClick={() => setMode('project')} />
          <MenuSep />
          {task.remindAt ? (
            <MenuItem
              Icon={BellOff}
              label={`Quitar recordatorio (${formatReminder(task.remindAt)})`}
              onClick={() => done(() => s.setReminder(task.id, null), 'Recordatorio quitado')}
            />
          ) : (
            <MenuItem Icon={Bell} label="Recordarme…" onClick={() => setMode('remind')} />
          )}
          <MenuSep />
          <MenuItem
            Icon={Trash2}
            label="Eliminar"
            danger
            onClick={() => done(() => s.deleteTask(task.id))}
          />
        </>
      )}

      {mode === 'date' && (
        <div className="p-1">
          <MenuLabel>Programar para</MenuLabel>
          <input
            type="date"
            value={date}
            min={addDaysISO(toISODate(), 1)}
            onChange={(e) => setDate(e.target.value)}
            className="mb-1.5 w-full rounded-[11px] border border-border-hi bg-ink px-2.5 py-1.5 text-xs text-paper outline-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => setMode('root')}
              className="flex-1 rounded-[11px] px-2 py-1.5 text-xs text-paper-dim hover:bg-ink-glass"
            >
              Atrás
            </button>
            <button
              onClick={() => done(() => s.moveTaskToDate(task.id, date), 'Programada')}
              className="flex-1 rounded-[11px] bg-orange px-2 py-1.5 text-xs text-onaccent"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {mode === 'project' && (
        <>
          <MenuLabel>Mover a</MenuLabel>
          {task.projectId !== TODAY_PROJECT_ID && (
            <MenuItem
              label="Hoy"
              onClick={() => done(() => s.moveTaskToProject(task.id, TODAY_PROJECT_ID), 'Movida a Hoy')}
            />
          )}
          {s.projects
            .filter((p) => p.id !== task.projectId)
            .map((p) => (
              <MenuItem
                key={p.id}
                label={p.name}
                onClick={() => done(() => s.moveTaskToProject(task.id, p.id), `Movida a ${p.name}`)}
              />
            ))}
          <MenuSep />
          <MenuItem label="Atrás" onClick={() => setMode('root')} />
        </>
      )}

      {mode === 'remind' && (
        <>
          <MenuLabel>Recordarme</MenuLabel>
          <MenuItem
            Icon={Bell}
            label="En 1 hora"
            onClick={() => done(() => s.setReminder(task.id, inHoursISO(1)), 'Recordatorio puesto')}
          />
          <MenuItem
            Icon={Bell}
            label="En 3 horas"
            onClick={() => done(() => s.setReminder(task.id, inHoursISO(3)), 'Recordatorio puesto')}
          />
          {laterToday && (
            <MenuItem
              Icon={Bell}
              label="Hoy a las 18:00"
              onClick={() => done(() => s.setReminder(task.id, laterToday), 'Recordatorio puesto')}
            />
          )}
          <MenuItem
            Icon={Bell}
            label="Mañana a las 9:00"
            onClick={() =>
              done(() => s.setReminder(task.id, tomorrowAtISO(9)), 'Recordatorio puesto')
            }
          />
          <div className="p-1">
            <MenuLabel>Otra hora</MenuLabel>
            <input
              type="datetime-local"
              value={when}
              min={toLocalInput(new Date())}
              onChange={(e) => setWhen(e.target.value)}
              className="mb-1.5 w-full rounded-[11px] border border-border-hi bg-ink px-2.5 py-1.5 text-xs text-paper outline-none"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => setMode('root')}
                className="flex-1 rounded-[11px] px-2 py-1.5 text-xs text-paper-dim hover:bg-ink-glass"
              >
                Atrás
              </button>
              <button
                onClick={() => {
                  const t = new Date(when).getTime()
                  if (Number.isNaN(t)) return
                  done(
                    () => s.setReminder(task.id, new Date(t).toISOString()),
                    'Recordatorio puesto'
                  )
                }}
                className="flex-1 rounded-[11px] bg-orange px-2 py-1.5 text-xs text-onaccent"
              >
                Listo
              </button>
            </div>
          </div>
        </>
      )}
    </ContextMenu>
  )
}
