import { useState } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { useAppStore, projectProgress } from '../store/useAppStore'
import ProgressRing from '../components/ProgressRing'
import ProjectChips from '../components/ProjectChips'
import TaskList from '../components/TaskList'
import AddTask from '../components/AddTask'

export default function Projects(): React.JSX.Element {
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const addTask = useAppStore((s) => s.addTask)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const renameProject = useAppStore((s) => s.renameProject)

  const active = projects.find((p) => p.id === activeProjectId) ?? null
  const [renaming, setRenaming] = useState(false)
  const prog = active ? projectProgress(active) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <section className="glass shrink-0 rounded-card p-4">
        <ProjectChips />
      </section>

      {!active || !prog ? (
        <section className="glass grid flex-1 place-items-center rounded-card p-6 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-paper-dim">
            Crea un proyecto para llevar su progreso acumulado. A diferencia de Hoy, un proyecto
            nunca se reinicia: vive semanas y crece con cada tarea.
          </p>
        </section>
      ) : (
        <>
          <section className="glass-strong flex shrink-0 items-center gap-5 rounded-card p-5">
            <div className="relative shrink-0">
              <div className="ring-halo pointer-events-none absolute inset-0" />
              <ProgressRing pct={prog.pct} sub={`${prog.done}/${prog.total}`} size={128} stroke={6} />
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
                Creado el {active.createdDate} · progreso acumulado, nunca se reinicia
              </p>
              <button
                onClick={() => deleteProject(active.id)}
                className="mt-1.5 flex w-fit items-center gap-1.5 rounded-chip border border-border px-3 py-1.5 text-xs text-paper-dim transition-colors hover:border-orange hover:text-orange"
              >
                <Trash2 size={13} strokeWidth={1.75} />
                Eliminar proyecto
              </button>
            </div>
          </section>

          <section className="glass flex min-h-0 flex-1 flex-col rounded-card p-5">
            <h3 className="mb-2.5 text-base">Tareas</h3>
            <div className="-mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
              <TaskList tasks={active.tasks} emptyHint="Este proyecto aún no tiene tareas." />
            </div>
            <div className="mt-3 shrink-0">
              <AddTask
                onAdd={(t) => addTask(t, active.id)}
                placeholder={`Agregar tarea a ${active.name}`}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
