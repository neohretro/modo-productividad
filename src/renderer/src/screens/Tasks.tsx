import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, FolderKanban, ListChecks } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ContextMenu, MenuItem, MenuSep, type MenuPos } from '../components/ContextMenu'
import TaskBoard from '../components/TaskBoard'

/**
 * "Tareas": todo lo que tienes por hacer, en un solo lugar. Lo que no tiene día
 * queda suelto aquí hasta que lo asignes a Hoy o a un día de la Semana.
 */
export default function Tasks(): React.JSX.Element {
  const projects = useAppStore((s) => s.projects)
  const tasks = useAppStore((s) => s.tasks)
  const [filter, setFilter] = useState<string | null>(null) // null = todos los proyectos
  const [pos, setPos] = useState<MenuPos | null>(null)
  const btn = useRef<HTMLButtonElement>(null)

  const pendingCount = useMemo(() => tasks.filter((t) => !t.done).length, [tasks])
  const current = projects.find((p) => p.id === filter)
  // Si el proyecto filtrado se elimina, vuelve a "todos".
  const projectId = current ? current.id : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-orange-soft text-orange">
          <ListChecks size={21} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl">Tareas</h2>
          <p className="text-xs leading-snug text-paper-dim">
            Todo lo que tienes por hacer ({pendingCount}). Las que no tienen día esperan aquí hasta
            que las asignes a Hoy o a un día de la Semana.
          </p>
        </div>

        {projects.length > 0 && (
          <>
            <button
              ref={btn}
              onClick={() => {
                const r = btn.current?.getBoundingClientRect()
                if (r) setPos({ x: r.right - 200, y: r.bottom + 4 })
              }}
              className="no-drag flex shrink-0 items-center gap-2 rounded-chip border border-border-hi px-3 py-2 text-xs text-paper transition-colors hover:border-orange"
            >
              <FolderKanban size={13} strokeWidth={1.75} className="text-orange" />
              <span className="max-w-[10rem] truncate">{current ? current.name : 'Todos los proyectos'}</span>
              <ChevronDown size={12} strokeWidth={2} className="text-paper-dim" />
            </button>
            {pos && (
              <ContextMenu pos={pos} onClose={() => setPos(null)}>
                <MenuItem
                  label="Todos los proyectos"
                  onClick={() => {
                    setFilter(null)
                    setPos(null)
                  }}
                  trailing={!current ? <Check size={12} strokeWidth={3} className="text-orange" /> : null}
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
                      current?.id === p.id ? <Check size={12} strokeWidth={3} className="text-orange" /> : null
                    }
                  />
                ))}
              </ContextMenu>
            )}
          </>
        )}
      </header>

      <TaskBoard key={projectId ?? 'all'} projectId={projectId} />
    </div>
  )
}
