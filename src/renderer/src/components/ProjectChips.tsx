import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAppStore, projectProgress } from '../store/useAppStore'

/** Selector de proyectos (chips) + crear proyecto nuevo. */
export default function ProjectChips(): React.JSX.Element {
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const addProject = useAppStore((s) => s.addProject)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const commit = (): void => {
    if (name.trim()) addProject(name)
    setName('')
    setCreating(false)
  }

  return (
    <div className="no-drag flex flex-wrap items-center gap-2">
      {projects.map((p) => {
        const { done, total } = projectProgress(p)
        const active = p.id === activeProjectId
        return (
          <button
            key={p.id}
            onClick={() => setActiveProject(p.id)}
            className={`rounded-chip border px-3 py-1.5 text-xs transition-colors duration-200 ease-modo ${
              active
                ? 'border-orange bg-orange-glow text-paper'
                : 'border-border bg-ink-glass text-paper-dim hover:text-paper'
            }`}
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
          className="rounded-chip border border-paper-dim bg-transparent px-3 py-1.5 text-xs outline-none"
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
