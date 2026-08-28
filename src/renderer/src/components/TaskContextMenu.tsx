import { useState } from 'react'
import {
  ArrowRightLeft,
  CalendarClock,
  CalendarPlus,
  Copy,
  CopyPlus,
  Trash2
} from 'lucide-react'
import { TODAY_PROJECT_ID, type Task } from '@shared/types'
import { addDaysISO, toISODate } from '@shared/date'
import { useAppStore } from '../store/useAppStore'
import { ContextMenu, MenuItem, MenuLabel, MenuSep, type MenuPos } from './ContextMenu'

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
  const [mode, setMode] = useState<'root' | 'date' | 'project'>('root')
  const [date, setDate] = useState(addDaysISO(toISODate(), 1))
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
    </ContextMenu>
  )
}
