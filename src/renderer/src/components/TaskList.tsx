import { useState } from 'react'
import { Check, Pause, Play, Trash2 } from 'lucide-react'
import type { Task } from '@shared/types'
import { useAppStore } from '../store/useAppStore'

interface Props {
  tasks: Task[]
  /** contador "lleva N días" (solo tiene sentido en Hoy). */
  showRolled?: boolean
  /** muestra el botón de enfoque (▶) en cada fila. */
  focusable?: boolean
  emptyHint?: string
}

export default function TaskList({
  tasks,
  showRolled,
  focusable,
  emptyHint
}: Props): React.JSX.Element {
  if (tasks.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-paper-dim">
        {emptyHint ?? 'Nada por aquí todavía.'}
      </p>
    )
  }

  const ordered = [...tasks].sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <ul className="flex flex-col gap-1.5">
      {ordered.map((t) => (
        <TaskItem key={t.id} task={t} showRolled={showRolled} focusable={focusable} />
      ))}
    </ul>
  )
}

function TaskItem({
  task,
  showRolled,
  focusable
}: {
  task: Task
  showRolled?: boolean
  focusable?: boolean
}): React.JSX.Element {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const editTask = useAppStore((s) => s.editTask)
  const toggleFocus = useAppStore((s) => s.toggleFocus)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.text)

  const running = task.focusStartedAt !== null

  return (
    <li
      className={`no-drag group flex animate-fade items-start gap-3 rounded-chip border px-3 py-2.5 transition-colors ${
        running ? 'border-orange/50 bg-orange-glow' : 'border-border bg-ink-glass'
      }`}
    >
      <button
        aria-label={task.done ? 'Marcar pendiente' : 'Completar'}
        onClick={() => toggleTask(task.id)}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center self-start rounded-md border transition-colors duration-200 ease-modo ${
          task.done
            ? 'border-orange bg-orange text-onaccent'
            : 'border-border-hi bg-transparent hover:border-orange'
        }`}
      >
        {task.done && <Check size={13} strokeWidth={3} className="animate-pop" />}
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
          className={`min-w-0 flex-1 py-0.5 text-sm leading-snug ${
            task.done ? 'text-paper-dim line-through' : 'text-paper'
          }`}
        >
          {task.text}
          {running && <span className="ml-2 text-[10px] uppercase text-orange no-underline">· en curso</span>}
        </span>
      )}

      <div className="mt-0.5 flex shrink-0 items-center gap-2 self-start">
        {showRolled && task.daysRolled > 0 && !task.done && (
          <span className="rounded-full bg-orange-glow px-2 py-0.5 text-[10px] text-orange">
            {task.daysRolled}d
          </span>
        )}

        {focusable && !task.done && (
          <button
            aria-label={running ? 'Pausar' : 'Trabajar en esta tarea'}
            onClick={() => toggleFocus(task.id)}
            className={`grid h-6 w-6 place-items-center rounded-full border transition-colors ${
              running
                ? 'border-orange bg-orange text-onaccent'
                : 'border-border-hi text-paper-dim opacity-0 hover:border-orange hover:text-orange group-hover:opacity-100'
            }`}
          >
            {running ? <Pause size={11} strokeWidth={2.5} /> : <Play size={11} strokeWidth={2.5} />}
          </button>
        )}

        <button
          aria-label="Borrar tarea"
          onClick={() => deleteTask(task.id)}
          className="text-paper-dim opacity-0 transition-opacity duration-150 hover:text-orange group-hover:opacity-100"
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      </div>
    </li>
  )
}
