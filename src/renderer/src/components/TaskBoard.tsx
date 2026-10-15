import { useMemo, useState } from 'react'
import type { Task } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import AddTask from './AddTask'
import ProjectPicker from './ProjectPicker'
import Segmented from './Segmented'
import TaskList from './TaskList'

type Tab = 'loose' | 'planned' | 'done'

const EMPTY: Record<Tab, string> = {
  loose: 'No hay tareas sueltas. Las que agregues sin día aparecen aquí.',
  planned: 'Ninguna tiene día asignado todavía.',
  done: 'Aún no has completado tareas aquí.'
}

/**
 * Tablero de tareas con 3 pestañas: sin día / con día / hechas. Se usa para
 * "Todas las tareas" (sin `projectId`) y para el detalle de un proyecto.
 */
export default function TaskBoard({ projectId }: { projectId?: string }): React.JSX.Element {
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const projects = useAppStore((s) => s.projects)
  const addTask = useAppStore((s) => s.addTask)
  const [tab, setTab] = useState<Tab>('loose')
  const [newLabel, setNewLabel] = useState<string | null>(null)

  const scoped = useMemo(() => {
    const keep = (t: Task): boolean => (projectId ? t.projectId === projectId : true)
    const live = tasks.filter(keep)
    const pending = live.filter((t) => !t.done)
    return {
      loose: pending.filter((t) => t.scheduledDate === null),
      planned: pending
        .filter((t) => t.scheduledDate !== null)
        .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '')),
      done: [...live.filter((t) => t.done), ...archivedTasks.filter((t) => t.done && keep(t))]
        .sort((a, b) => (b.completedDate ?? '').localeCompare(a.completedDate ?? ''))
        .slice(0, 40)
    }
  }, [tasks, archivedTasks, projectId])

  return (
    <section className="glass flex min-h-0 flex-1 flex-col rounded-card p-5">
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

      <div className="-mr-1.5 min-h-0 flex-1 overflow-y-auto pr-1.5">
        <TaskList
          tasks={scoped[tab]}
          showDay={tab !== 'done'}
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
              : 'Agregar una tarea (queda sin día hasta que la asignes)'
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
