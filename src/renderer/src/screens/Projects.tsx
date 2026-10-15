import { useMemo, useState } from 'react'
import { ArrowLeft, Check, FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { ALL_TASKS_ID } from '@shared/types'
import { projectProgressOf } from '@shared/tasks'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from '../components/ProgressRing'
import TaskBoard from '../components/TaskBoard'

/**
 * "Proyectos": tus proyectos como tarjetas. Un proyecto es una etiqueta que le
 * pones a las tareas; al abrirlo ves todas las que lo llevan, estén en el día
 * que estén. Las tareas siguen siendo las mismas de Hoy y de la Semana.
 */
export default function Projects(): React.JSX.Element {
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const projects = useAppStore((s) => s.projects)
  const open = projects.find((p) => p.id === activeProjectId)
  return open ? <ProjectDetail projectId={open.id} /> : <ProjectGrid />
}

function ProjectGrid(): React.JSX.Element {
  const projects = useAppStore((s) => s.projects)
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const addProject = useAppStore((s) => s.addProject)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const stats = useMemo(
    () =>
      projects.map((p) => {
        const live = tasks.filter((t) => t.projectId === p.id && !t.done)
        return {
          p,
          ...projectProgressOf({ tasks, archivedTasks }, p.id),
          loose: live.filter((t) => t.scheduledDate === null).length,
          planned: live.filter((t) => t.scheduledDate !== null).length
        }
      }),
    [projects, tasks, archivedTasks]
  )

  const commit = (): void => {
    if (name.trim()) {
      addProject(name) // abre el proyecto nuevo
    }
    setName('')
    setCreating(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-orange-soft text-orange">
          <FolderKanban size={21} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl">Proyectos</h2>
          <p className="text-xs leading-snug text-paper-dim">
            Cada proyecto junta las tareas que lo llevan como etiqueta. Toca uno para verlas.
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 min-[1000px]:grid-cols-3">
        {stats.map(({ p, done, total, pct, loose, planned }) => (
          <button
            key={p.id}
            onClick={() => setActiveProject(p.id)}
            className="glass group flex flex-col gap-3 rounded-card p-4 text-left transition-all duration-200 ease-modo hover:-translate-y-0.5 hover:border-orange"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-orange-soft text-orange">
                <FolderKanban size={17} strokeWidth={1.75} />
              </span>
              <h3 className="line-clamp-2 text-base leading-snug">{p.name}</h3>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-paper-dim">
                <span>
                  {done} de {total} hechas
                </span>
                <span className="tabular-nums">{Math.round(pct * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink">
                <div
                  className="h-full rounded-full bg-orange transition-all duration-500 ease-modo"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded-full bg-ink-soft px-2 py-0.5 text-paper-dim">
                {loose} sin día
              </span>
              <span className="rounded-full bg-ink-soft px-2 py-0.5 text-paper-dim">
                {planned} con día
              </span>
            </div>
          </button>
        ))}

        {creating ? (
          <div className="glass flex flex-col justify-center gap-2 rounded-card border-orange p-4">
            <p className="text-xs text-paper-dim">Nombre del proyecto</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setName('')
                  setCreating(false)
                }
              }}
              placeholder="Ej: Mi canal de YouTube"
              className="rounded-chip border border-border-hi bg-transparent px-3 py-2 text-sm outline-none focus:border-orange"
            />
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-hi text-paper-dim transition-colors hover:border-orange hover:bg-orange-soft hover:text-orange"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-soft">
              <Plus size={18} strokeWidth={2} />
            </span>
            <span className="text-sm">Nuevo proyecto</span>
          </button>
        )}
      </div>
    </div>
  )
}

function ProjectDetail({ projectId }: { projectId: string }): React.JSX.Element {
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId))
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const renameProject = useAppStore((s) => s.renameProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const [renaming, setRenaming] = useState(false)

  if (!project) return <ProjectGrid />
  const prog = projectProgressOf({ tasks, archivedTasks }, project.id)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <button
        onClick={() => setActiveProject(ALL_TASKS_ID)}
        className="no-drag flex w-fit shrink-0 items-center gap-1.5 rounded-chip px-2 py-1 text-xs text-paper-dim transition-colors hover:text-orange"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Todos los proyectos
      </button>

      <section className="glass-strong flex shrink-0 items-center gap-5 rounded-card px-5 py-4">
        <div className="relative shrink-0">
          <div className="ring-halo pointer-events-none absolute inset-0" />
          <ProgressRing pct={prog.pct} sub={`${prog.done}/${prog.total}`} size={92} stroke={5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                defaultValue={project.name}
                onBlur={(e) => {
                  renameProject(project.id, e.target.value)
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
              <h2 className="truncate text-2xl">{project.name}</h2>
              <Pencil
                size={14}
                strokeWidth={1.75}
                className="shrink-0 text-paper-dim opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          )}
          <p className="text-xs text-paper-dim">
            {prog.done} de {prog.total} tareas hechas. El avance se va sumando y nunca se reinicia.
          </p>
        </div>
        <button
          onClick={() => deleteProject(project.id)}
          title="Las tareas se conservan, solo pierden esta etiqueta"
          className="flex shrink-0 items-center gap-1.5 rounded-chip border border-border px-3 py-1.5 text-xs text-paper-dim transition-colors hover:border-orange hover:text-orange"
        >
          <Trash2 size={13} strokeWidth={1.75} />
          Quitar proyecto
        </button>
      </section>

      <TaskBoard projectId={project.id} />
    </div>
  )
}
