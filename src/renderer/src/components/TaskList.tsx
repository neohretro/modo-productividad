import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { Task } from '@shared/types'
import { useAppStore } from '../store/useAppStore'

interface Props {
  tasks: Task[]
  /** muestra el contador "lleva N días" (solo tiene sentido en Hoy). */
  showRolled?: boolean
  emptyHint?: string
}

export default function TaskList({ tasks, showRolled, emptyHint }: Props): React.JSX.Element {
  if (tasks.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-paper-dim">
        {emptyHint ?? 'Nada por aquí todavía.'}
      </p>
    )
  }

  // pendientes primero, luego completadas
  const ordered = [...tasks].sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <ul className="flex flex-col gap-1.5">
      {ordered.map((t) => (
        <TaskItem key={t.id} task={t} showRolled={showRolled} />
      ))}
    </ul>
  )
}

function TaskItem({ task, showRolled }: { task: Task; showRolled?: boolean }): React.JSX.Element {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const editTask = useAppStore((s) => s.editTask)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.text)

  return (
    <li className="no-drag group flex animate-fade items-center gap-3 rounded-chip border border-border bg-ink-glass px-3 py-2.5">
      <button
        aria-label={task.done ? 'Marcar pendiente' : 'Completar'}
        onClick={() => toggleTask(task.id)}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors duration-200 ease-modo ${
          task.done
            ? 'border-orange bg-orange text-ink'
            : 'border-border bg-transparent hover:border-paper-dim'
        }`}
      >
        {task.done && <Check size={13} strokeWidth={3} />}
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            editTask(task.id, draft)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setDraft(task.text)
              setEditing(false)
            }
          }}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => {
            setDraft(task.text)
            setEditing(true)
          }}
          className={`flex-1 truncate text-sm ${
            task.done ? 'text-paper-dim line-through' : 'text-paper'
          }`}
        >
          {task.text}
        </span>
      )}

      {showRolled && task.daysRolled > 0 && !task.done && (
        <span className="shrink-0 rounded-full bg-orange-glow px-2 py-0.5 text-[10px] text-orange">
          {task.daysRolled}d
        </span>
      )}

      <button
        aria-label="Borrar tarea"
        onClick={() => deleteTask(task.id)}
        className="shrink-0 text-paper-dim opacity-0 transition-opacity duration-150 hover:text-orange group-hover:opacity-100"
      >
        <Trash2 size={15} strokeWidth={1.75} />
      </button>
    </li>
  )
}
