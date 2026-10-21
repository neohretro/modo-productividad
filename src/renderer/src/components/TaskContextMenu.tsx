import { useState } from 'react'
import {
  Bell,
  BellOff,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Check,
  Clock,
  Copy,
  CopyPlus,
  FolderKanban,
  Minus,
  Pencil,
  Pin,
  PinOff,
  Power,
  Sun,
  Trash2
} from 'lucide-react'
import type { Task } from '@shared/types'
import { addDaysISO, toISODate } from '@shared/date'
import { inHoursISO, laterTodayISO, tomorrowAtISO } from '@shared/reminders'
import { formatDurationLong, MAX_MANUAL_MS } from '@shared/focus'
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

/** El menú también se usa en la ventana mini (mini.html): ahí suma "Fijar en el escritorio". */
const IN_MINI = typeof window !== 'undefined' && window.location.pathname.endsWith('mini.html')

export type MenuMode = 'root' | 'date' | 'project' | 'remind' | 'time'

export default function TaskContextMenu({
  task,
  pos,
  initialMode = 'root',
  onClose
}: {
  task: Task
  pos: MenuPos
  initialMode?: MenuMode
  onClose: () => void
}): React.JSX.Element {
  const s = useAppStore()
  const [mode, setMode] = useState<MenuMode>(initialMode)
  const [date, setDate] = useState(addDaysISO(toISODate(), 1))
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 3_600_000)))
  const laterToday = laterTodayISO(18)
  const today = toISODate()
  const inToday = task.scheduledDate !== null && task.scheduledDate <= today

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
          {!inToday && (
            <MenuItem
              Icon={Sun}
              label="Para hoy"
              onClick={() => done(() => s.assignDay(task.id, today), 'Asignada a hoy')}
            />
          )}
          <MenuItem
            Icon={CalendarPlus}
            label="Para mañana"
            onClick={() =>
              done(() => s.assignDay(task.id, addDaysISO(today, 1)), 'Asignada a mañana')
            }
          />
          <MenuItem Icon={CalendarClock} label="Para otra fecha…" onClick={() => setMode('date')} />
          {task.scheduledDate !== null && (
            <MenuItem
              Icon={CalendarX2}
              label="Quitar el día (suelta)"
              onClick={() => done(() => s.assignDay(task.id, null), 'Quedó sin día')}
            />
          )}
          <MenuItem Icon={FolderKanban} label="Proyecto…" onClick={() => setMode('project')} />
          <MenuItem
            Icon={Clock}
            label="Tiempo dedicado…"
            onClick={() => setMode('time')}
            trailing={
              task.timeSpentMs >= 60_000 ? (
                <span className="text-[10px] text-paper-dim">{formatDurationLong(task.timeSpentMs)}</span>
              ) : null
            }
          />
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
          {IN_MINI && (
            <>
              <MenuSep />
              <MenuItem
                Icon={s.settings.miniPinned ? PinOff : Pin}
                label={s.settings.miniPinned ? 'Dejar siempre visible' : 'Fijar en el escritorio'}
                onClick={() => done(() => s.setMiniPinned(!s.settings.miniPinned))}
              />
              <MenuItem
                Icon={Minus}
                label="Minimizar"
                onClick={() => done(() => window.modo?.hideMini())}
              />
              <MenuItem
                Icon={Power}
                label="Cerrar la app"
                danger
                onClick={() => done(() => window.modo?.quitApp())}
              />
            </>
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

      {mode === 'time' && (
        <TimeEditor
          initialMs={task.timeSpentMs}
          running={task.focusStartedAt !== null}
          onBack={initialMode === 'time' ? onClose : () => setMode('root')}
          onSave={(ms) => done(() => s.setTaskTime(task.id, ms), 'Tiempo guardado')}
        />
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
              onClick={() => done(() => s.assignDay(task.id, date), 'Día asignado')}
              className="flex-1 rounded-[11px] bg-orange px-2 py-1.5 text-xs text-onaccent"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {mode === 'project' && (
        <>
          <MenuLabel>Proyecto</MenuLabel>
          <MenuItem
            label="Sin proyecto"
            onClick={() => done(() => s.setTaskProject(task.id, null), 'Sin proyecto')}
            trailing={task.projectId === null ? <Check size={12} strokeWidth={3} className="text-orange" /> : null}
          />
          {s.projects.map((p) => (
            <MenuItem
              key={p.id}
              Icon={FolderKanban}
              label={p.name}
              onClick={() => done(() => s.setTaskProject(task.id, p.id), `En ${p.name}`)}
              trailing={task.projectId === p.id ? <Check size={12} strokeWidth={3} className="text-orange" /> : null}
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

/** Editor del tiempo total: horas + minutos, con atajos para sumar lo que se olvidó medir. */
function TimeEditor({
  initialMs,
  running,
  onBack,
  onSave
}: {
  initialMs: number
  running: boolean
  onBack: () => void
  onSave: (ms: number) => void
}): React.JSX.Element {
  const totalMin = Math.floor(initialMs / 60_000)
  const [hours, setHours] = useState(String(Math.floor(totalMin / 60)))
  const [mins, setMins] = useState(String(totalMin % 60))

  const toMs = (): number => {
    const h = Math.max(0, parseInt(hours, 10) || 0)
    const m = Math.max(0, parseInt(mins, 10) || 0)
    return Math.min(MAX_MANUAL_MS, (h * 60 + m) * 60_000)
  }
  const add = (minutes: number): void => {
    const total = Math.floor(toMs() / 60_000) + minutes
    setHours(String(Math.floor(total / 60)))
    setMins(String(total % 60))
  }

  const field =
    'w-full rounded-[11px] border border-border-hi bg-ink px-2.5 py-1.5 text-center text-sm tabular-nums text-paper outline-none focus:border-orange'
  return (
    <div className="w-[220px] p-1">
      <MenuLabel>Tiempo dedicado</MenuLabel>
      <p className="px-2.5 pb-2 text-[11px] leading-snug text-paper-dim">
        ¿Olvidaste medirlo? Escribe el total o suma lo que falta.
        {running && ' Sigue contando desde ahora.'}
      </p>
      <div className="mb-2 flex items-end gap-2">
        <label className="flex-1 text-[10px] text-paper-dim">
          Horas
          <input
            type="number"
            min={0}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className={`${field} mt-0.5`}
          />
        </label>
        <label className="flex-1 text-[10px] text-paper-dim">
          Minutos
          <input
            type="number"
            min={0}
            value={mins}
            onChange={(e) => setMins(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(toMs())
            }}
            className={`${field} mt-0.5`}
          />
        </label>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {[
          ['+15 min', 15],
          ['+30 min', 30],
          ['+1 h', 60],
          ['+2 h', 120]
        ].map(([label, n]) => (
          <button
            key={label}
            onClick={() => add(n as number)}
            className="rounded-full border border-border-hi px-2 py-0.5 text-[10px] text-paper-dim transition-colors hover:border-orange hover:text-orange"
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => {
            setHours('0')
            setMins('0')
          }}
          className="rounded-full px-2 py-0.5 text-[10px] text-paper-dim transition-colors hover:text-orange"
        >
          Borrar
        </button>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onBack}
          className="flex-1 rounded-[11px] px-2 py-1.5 text-xs text-paper-dim hover:bg-ink-glass"
        >
          Atrás
        </button>
        <button
          onClick={() => onSave(toMs())}
          className="flex-1 rounded-[11px] bg-orange px-2 py-1.5 text-xs text-onaccent"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}
