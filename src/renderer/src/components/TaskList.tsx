import { useState } from 'react'
import { Bell, Check, Pause, Play, Trash2 } from 'lucide-react'
import type { Task } from '@shared/types'
import { focusPhase, focusSortRank, formatDurationLong } from '@shared/focus'
import { projectNameOf, useAppStore } from '../store/useAppStore'
import { useTaskMenu } from '../hooks/useTaskMenu'
import ProjectChip from './ProjectChip'

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

  // En curso primero, luego en pausa, luego sin empezar, y lo hecho al final.
  const ordered = [...tasks].sort((a, b) => focusSortRank(a) - focusSortRank(b))

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
  const editing = useAppStore((s) => s.editingTaskId === task.id)
  const setEditingTask = useAppStore((s) => s.setEditingTask)
  const projectName = useAppStore((s) => projectNameOf(s, task))
  const [draft, setDraft] = useState(task.text)
  const { onContextMenu, menu } = useTaskMenu(task)

  const startEdit = (): void => {
    setDraft(task.text)
    setEditingTask(task.id)
  }
  const phase = focusPhase(task)
  const running = phase === 'running'
  const paused = phase === 'paused'

  return (
    <li
      onContextMenu={onContextMenu}
      className={`no-drag group flex animate-fade items-start gap-3 rounded-chip border px-3 py-2.5 transition-colors ${
        running
          ? 'border-orange/50 bg-orange-glow'
          : paused
            ? 'border-orange/25 bg-ink-soft'
            : 'border-border bg-ink-soft'
      }`}
    >
      {menu}
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
            setEditingTask(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setDraft(task.text)
              setEditingTask(null)
            }
          }}
          className="flex-1 rounded-md bg-transparent text-sm outline-none ring-1 ring-orange/60"
        />
      ) : (
        <span
          onDoubleClick={startEdit}
          className={`min-w-0 flex-1 select-text py-0.5 text-sm leading-snug selection:bg-orange/30 ${
            task.done ? 'text-paper-dim line-through' : 'text-paper'
          }`}
        >
          {task.text}
          {projectName && (
            <ProjectChip name={projectName} className="ml-2 -translate-y-px align-middle no-underline" />
          )}
          {running && (
            <span className="ml-2 select-none text-[10px] uppercase text-orange no-underline">
              · en curso
            </span>
          )}
          {paused && (
            <span className="ml-2 select-none text-[10px] uppercase text-paper-dim no-underline">
              · en pausa{task.timeSpentMs >= 1000 ? ` · ${formatDurationLong(task.timeSpentMs)}` : ''}
            </span>
          )}
        </span>
      )}

      <div className="mt-0.5 flex shrink-0 items-center gap-2 self-start">
        {task.remindAt && !task.done && (
          <Bell size={13} strokeWidth={2} className="text-orange" aria-label="Con recordatorio" />
        )}

        {showRolled && task.daysRolled > 0 && !task.done && (
          <span className="rounded-full bg-orange-glow px-2 py-0.5 text-[10px] text-orange">
            {task.daysRolled}d
          </span>
        )}

        {focusable && !task.done && (
          <button
            aria-label={running ? 'Pausar' : paused ? 'Reanudar' : 'Trabajar en esta tarea'}
            onClick={() => toggleFocus(task.id)}
            className={`grid h-6 w-6 place-items-center rounded-full border transition-colors ${
              running
                ? 'border-orange bg-orange text-onaccent'
                : paused
                  ? 'border-orange/60 text-orange hover:bg-orange hover:text-onaccent'
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
