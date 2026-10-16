import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, FolderKanban } from 'lucide-react'
import type { Task } from '@shared/types'
import { toISODate } from '@shared/date'
import { useAppStore } from '../store/useAppStore'
import AddTask from './AddTask'
import { ContextMenu, MenuItem, MenuSep, type MenuPos } from './ContextMenu'
import ProjectPicker from './ProjectPicker'
import Segmented from './Segmented'
import TaskList from './TaskList'
import { useWheelForward } from '../hooks/useWheelForward'

type Tab = 'loose' | 'planned' | 'done'

const EMPTY: Record<Tab, string> = {
  loose: 'No hay tareas sueltas. Las que agregues sin día aparecen aquí.',
  planned: 'Ninguna tiene día asignado todavía.',
  done: 'Aún no has completado tareas aquí.'
}

/**
 * Todas tus tareas, con 3 pestañas: sin día / con día / hechas. Las sueltas y
 * las de otros días traen un botón "Hoy" para llevarlas a tu día de un clic.
 *
 * - Sin `projectId` y con `filterable`: muestra todo y deja filtrar por proyecto.
 * - Con `projectId`: solo las de ese proyecto (detalle de un proyecto).
 * - `compact`: para columnas angostas (el "Asignar día" queda como ícono).
 */
export default function TaskBoard({
  projectId: fixedProject,
  title,
  filterable = false,
  compact = false,
  excludeToday = false,
  className = ''
}: {
  projectId?: string
  title?: string
  filterable?: boolean
  compact?: boolean
  /** oculta lo que ya está en Hoy (cuando Hoy tiene su propia columna al lado). */
  excludeToday?: boolean
  className?: string
}): React.JSX.Element {
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const projects = useAppStore((s) => s.projects)
  const addTask = useAppStore((s) => s.addTask)
  const [tab, setTab] = useState<Tab>('loose')
  const [newLabel, setNewLabel] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [pos, setPos] = useState<MenuPos | null>(null)
  const filterBtn = useRef<HTMLButtonElement>(null)

  const filtered = filterable ? projects.find((p) => p.id === filter) : undefined
  const projectId = fixedProject ?? filtered?.id

  const scoped = useMemo(() => {
    const keep = (t: Task): boolean => (projectId ? t.projectId === projectId : true)
    const today = toISODate()
    const live = tasks.filter(keep)
    const pending = live.filter(
      (t) => !t.done && !(excludeToday && t.scheduledDate !== null && t.scheduledDate <= today)
    )
    return {
      loose: pending.filter((t) => t.scheduledDate === null),
      // "con día" = lo que aún no está en Hoy (Hoy ya tiene su propia columna)
      planned: pending
        .filter((t) => t.scheduledDate !== null)
        .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '')),
      done: [...live.filter((t) => t.done), ...archivedTasks.filter((t) => t.done && keep(t))]
        .sort((a, b) => (b.completedDate ?? '').localeCompare(a.completedDate ?? ''))
        .slice(0, 40)
    }
  }, [tasks, archivedTasks, projectId, excludeToday])

  const total = scoped.loose.length + scoped.planned.length
  const { listRef, onWheel } = useWheelForward()

  return (
    <section
      onWheel={onWheel}
      className={`glass flex min-h-0 min-w-0 flex-col rounded-card p-4 ${className}`}
    >
      {title && (
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <h2 className="text-base">{title}</h2>
          {total > 0 && (
            <span className="rounded-full bg-ink-soft px-2 py-0.5 text-[10px] tabular-nums text-paper-dim">
              {total}
            </span>
          )}
          <span className="flex-1" />
          {filterable && projects.length > 0 && (
            <>
              <button
                ref={filterBtn}
                onClick={() => {
                  const r = filterBtn.current?.getBoundingClientRect()
                  if (r) setPos({ x: Math.max(8, r.right - 200), y: r.bottom + 4 })
                }}
                className="no-drag flex max-w-[11rem] items-center gap-1.5 rounded-chip border border-border-hi px-2.5 py-1 text-[11px] text-paper transition-colors hover:border-orange"
              >
                <FolderKanban size={12} strokeWidth={1.75} className="shrink-0 text-orange" />
                <span className="truncate">{filtered ? filtered.name : 'Todos los proyectos'}</span>
                <ChevronDown size={11} strokeWidth={2} className="shrink-0 text-paper-dim" />
              </button>
              {pos && (
                <ContextMenu pos={pos} onClose={() => setPos(null)}>
                  <MenuItem
                    label="Todos los proyectos"
                    onClick={() => {
                      setFilter(null)
                      setPos(null)
                    }}
                    trailing={!filtered ? <Check size={12} strokeWidth={3} className="text-orange" /> : null}
                  />
                  <MenuSep />
                  {projects.map((p) => (
                    <MenuItem
                      key={p.id}
                      Icon={FolderKanban}
                      label={p.name}
                      onClick={() => {
                        setFilter(p.id)
                        setPos(null)
                      }}
                      trailing={
                        filtered?.id === p.id ? <Check size={12} strokeWidth={3} className="text-orange" /> : null
                      }
                    />
                  ))}
                </ContextMenu>
              )}
            </>
          )}
        </div>
      )}

      <div className="mb-3 shrink-0">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { id: 'loose', label: 'Sin día', count: scoped.loose.length },
            { id: 'planned', label: 'Con día', count: scoped.planned.length },
            { id: 'done', label: 'Hechas', count: scoped.done.length }
          ]}
        />
      </div>

      <div ref={listRef} className="-mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
        <TaskList
          tasks={scoped[tab]}
          showDay={tab !== 'done'}
          quickToday={tab !== 'done'}
          compactDay={compact}
          hideProject={!!projectId}
          focusable={tab !== 'done'}
          emptyHint={EMPTY[tab]}
        />
      </div>

      <div className="mt-3 flex shrink-0 flex-col gap-1.5">
        <AddTask
          onAdd={(t) => addTask(t, { projectId: projectId ?? newLabel, date: null })}
          placeholder={
            projectId
              ? `Agregar tarea a ${projects.find((p) => p.id === projectId)?.name ?? 'este proyecto'}`
              : 'Agregar una tarea sin día'
          }
        />
        {!projectId && projects.length > 0 && (
          <div className="flex items-center gap-2 px-1 text-[10px] text-paper-dim">
            <span>Proyecto:</span>
            <ProjectPicker value={newLabel} onChange={setNewLabel} />
          </div>
        )}
      </div>
    </section>
  )
}
