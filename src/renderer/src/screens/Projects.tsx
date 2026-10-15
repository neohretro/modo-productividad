import { useMemo, useState } from 'react'
import { Check, ChevronRight, Inbox, Pencil, Trash2 } from 'lucide-react'
import { ALL_TASKS_ID, type Task } from '@shared/types'
import { projectProgressOf } from '@shared/tasks'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from '../components/ProgressRing'
import ProjectChips from '../components/ProjectChips'
import ProjectPicker from '../components/ProjectPicker'
import TaskList from '../components/TaskList'
import AddTask from '../components/AddTask'

export default function Projects(): React.JSX.Element {
  const projects = useAppStore((s) => s.projects)
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const addTask = useAppStore((s) => s.addTask)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const renameProject = useAppStore((s) => s.renameProject)

  const isAll = activeProjectId === ALL_TASKS_ID
  const active = isAll ? null : (projects.find((p) => p.id === activeProjectId) ?? null)
  const [renaming, setRenaming] = useState(false)
  const [newLabel, setNewLabel] = useState<string | null>(null)

  // Las tareas de la vista: todas las vivas (Todas las tareas) o las de la etiqueta.
  const scoped = useMemo(() => {
    const keep = (t: Task): boolean => (active ? t.projectId === active.id : true)
    const live = tasks.filter(keep)
    const doneArchived = archivedTasks.filter((t) => t.done && keep(t))
    const pending = live.filter((t) => !t.done)
    return {
      loose: pending.filter((t) => t.scheduledDate === null),
      planned: pending
        .filter((t) => t.scheduledDate !== null)
        .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '')),
      done: [...live.filter((t) => t.done), ...doneArchived]
        .sort((a, b) => (b.completedDate ?? '').localeCompare(a.completedDate ?? ''))
        .slice(0, 30)
    }
  }, [tasks, archivedTasks, active])

  const prog = active ? projectProgressOf({ tasks, archivedTasks }, active.id) : null
  const createLabel = active ? active.id : newLabel
  const placeholder = active
    ? `Agregar tarea a ${active.name}`
    : 'Agregar una tarea suelta (sin día)'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <section className="glass shrink-0 rounded-card p-4">
        <ProjectChips />
      </section>

      {isAll ? (
        <section className="glass-strong flex shrink-0 items-center gap-4 rounded-card px-5 py-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-orange-soft text-orange">
            <Inbox size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl">Todas las tareas</h2>
            <p className="text-xs leading-snug text-paper-dim">
              Todo lo que tienes, de cualquier proyecto. Las que no tienen día quedan sueltas aquí
              hasta que las asignes a Hoy o a un día de tu semana.
            </p>
          </div>
        </section>
      ) : !active || !prog ? (
        <section className="glass grid flex-1 place-items-center rounded-card p-6 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-paper-dim">Este proyecto ya no existe.</p>
        </section>
      ) : (
        <section className="glass-strong flex shrink-0 items-center gap-5 rounded-card p-5">
          <div className="relative shrink-0">
            <div className="ring-halo pointer-events-none absolute inset-0" />
            <ProgressRing pct={prog.pct} sub={`${prog.done}/${prog.total}`} size={112} stroke={6} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  defaultValue={active.name}
                  onBlur={(e) => {
                    renameProject(active.id, e.target.value)
                    setRenaming(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setRenaming(false)
                  }}
                  className="min-w-0 flex-1 rounded-chip border border-orange bg-transparent px-3 py-1.5 text-xl outline-none"
                />
                <Check size={16} strokeWidth={2} className="shrink-0 text-orange" />
              </div>
            ) : (
              <button
                onClick={() => setRenaming(true)}
                className="group flex items-center gap-2 text-left"
                title="Cambiar nombre"
              >
                <h2 className="truncate text-2xl">{active.name}</h2>
                <Pencil
                  size={14}
                  strokeWidth={1.75}
                  className="shrink-0 text-paper-dim opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            )}
            <p className="text-xs text-paper-dim">
              Etiqueta creada el {active.createdDate} · el avance es acumulado y nunca se reinicia
            </p>
            <button
              onClick={() => deleteProject(active.id)}
              title="Las tareas se conservan, solo pierden esta etiqueta"
              className="mt-1 flex w-fit items-center gap-1.5 rounded-chip border border-border px-3 py-1.5 text-xs text-paper-dim transition-colors hover:border-orange hover:text-orange"
            >
              <Trash2 size={13} strokeWidth={1.75} />
              Quitar proyecto
            </button>
          </div>
        </section>
      )}

      {(isAll || active) && (
        <section className="glass flex min-h-0 flex-1 flex-col rounded-card p-5">
          <div className="-mr-1.5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1.5">
            <Group
              title="Sin día asignado"
              hint="Asígnales un día cuando las vayas a trabajar"
              count={scoped.loose.length}
            >
              <TaskList
                tasks={scoped.loose}
                showDay
                hideProject={!!active}
                focusable
                emptyHint={
                  isAll
                    ? 'Nada suelto. Lo que agregues sin día aparece aquí.'
                    : 'Este proyecto no tiene tareas sueltas.'
                }
              />
            </Group>

            {scoped.planned.length > 0 && (
              <Group title="Con día asignado" count={scoped.planned.length}>
                <TaskList tasks={scoped.planned} showDay hideProject={!!active} focusable />
              </Group>
            )}

            {scoped.done.length > 0 && (
              <Group title="Hechas" count={scoped.done.length} collapsed>
                <TaskList tasks={scoped.done} hideProject={!!active} />
              </Group>
            )}
          </div>

          <div className="mt-3 flex shrink-0 flex-col gap-1.5">
            <AddTask
              onAdd={(t) => addTask(t, { projectId: createLabel, date: null })}
              placeholder={placeholder}
            />
            {!active && projects.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-[10px] text-paper-dim">
                <span>Etiqueta:</span>
                <ProjectPicker value={newLabel} onChange={setNewLabel} />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

/** Bloque con título y contador; `collapsed` lo deja cerrado al inicio. */
function Group({
  title,
  hint,
  count,
  collapsed = false,
  children
}: {
  title: string
  hint?: string
  count: number
  collapsed?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(!collapsed)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <h3 className="text-sm">{title}</h3>
        <span className="rounded-full bg-ink-soft px-2 py-0.5 text-[10px] tabular-nums text-paper-dim">
          {count}
        </span>
        {hint && <span className="truncate text-[10px] text-paper-dim">{hint}</span>}
      </button>
      {open && children}
    </div>
  )
}
