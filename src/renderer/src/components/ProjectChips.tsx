import { useMemo, useState } from 'react'
import { Inbox, Plus } from 'lucide-react'
import { ALL_TASKS_ID } from '@shared/types'
import { projectProgressOf } from '@shared/tasks'
import { useAppStore } from '../store/useAppStore'

/**
 * Selector de vista en Proyectos: "Todas las tareas" + un chip por proyecto
 * (etiqueta) + crear proyecto nuevo.
 */
export default function ProjectChips(): React.JSX.Element {
  const projects = useAppStore((s) => s.projects)
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const addProject = useAppStore((s) => s.addProject)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const looseCount = useMemo(
    () => tasks.filter((t) => t.scheduledDate === null && !t.done).length,
    [tasks]
  )

  const commit = (): void => {
    if (name.trim()) addProject(name)
    setName('')
    setCreating(false)
  }

  const chip = (active: boolean): string =>
    `rounded-chip border px-3 py-1.5 text-xs transition-colors duration-200 ease-modo ${
      active
        ? 'border-orange bg-orange-glow text-paper'
        : 'border-border bg-ink-glass text-paper-dim hover:text-paper'
    }`

  return (
    <div className="no-drag flex flex-wrap items-center gap-2">
      <button onClick={() => setActiveProject(ALL_TASKS_ID)} className={chip(activeProjectId === ALL_TASKS_ID)}>
        <span className="inline-flex items-center gap-1.5">
          <Inbox size={12} strokeWidth={1.75} />
          Todas las tareas
          {looseCount > 0 && (
            <span
              className="rounded-full bg-orange px-1.5 text-[9px] font-medium tabular-nums text-onaccent"
              title="Tareas sin día asignado"
            >
              {looseCount}
            </span>
          )}
        </span>
      </button>

      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />

      {projects.map((p) => {
        const { done, total } = projectProgressOf({ tasks, archivedTasks }, p.id)
        return (
          <button
            key={p.id}
            onClick={() => setActiveProject(p.id)}
            className={chip(p.id === activeProjectId)}
          >
            {p.name}
            <span className="ml-2 tabular-nums opacity-60">
              {done}/{total}
            </span>
          </button>
        )
      })}

      {creating ? (
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
          placeholder="Nombre del proyecto"
          className="rounded-chip border border-border-hi bg-transparent px-3 py-1.5 text-xs outline-none"
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-chip border border-dashed border-border px-3 py-1.5 text-xs text-paper-dim hover:text-paper"
        >
          <Plus size={13} strokeWidth={1.75} />
          Proyecto
        </button>
      )}
    </div>
  )
}
