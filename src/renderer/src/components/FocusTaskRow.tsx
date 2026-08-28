import { useState } from 'react'
import { Bell, Check, Pause, Play } from 'lucide-react'
import type { Task } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { useTaskMenu } from '../hooks/useTaskMenu'

/**
 * Fila de tarea con enfoque: ▶ para empezar / ⏸ para pausar (el tiempo se
 * acumula entre tramos, la pausa no cuenta), ✓ para completar.
 * La fila NO es zona de arrastre: así funcionan el clic derecho y seleccionar
 * texto. El mini se arrastra desde todo lo demás (cabecera, anillo, huecos).
 */
export default function FocusTaskRow({ task }: { task: Task }): React.JSX.Element {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const toggleFocus = useAppStore((s) => s.toggleFocus)
  const editTask = useAppStore((s) => s.editTask)
  const editing = useAppStore((s) => s.editingTaskId === task.id)
  const setEditingTask = useAppStore((s) => s.setEditingTask)
  const { onContextMenu, menu } = useTaskMenu(task)
  const [draft, setDraft] = useState(task.text)
  const running = task.focusStartedAt !== null

  return (
    <li
      onContextMenu={onContextMenu}
      className={`no-drag flex animate-fade items-start gap-2 rounded-chip border px-2.5 py-2 transition-colors ${
        running ? 'border-orange/50 bg-orange-glow' : 'border-border bg-ink-soft'
      }`}
    >
      {menu}
      <button
        aria-label={running ? 'Pausar' : 'Trabajar en esta tarea'}
        onClick={() => toggleFocus(task.id)}
        className={`no-drag mt-0.5 grid h-7 w-7 shrink-0 place-items-center self-start rounded-full border transition-colors ${
          running
            ? 'border-orange bg-orange text-onaccent'
            : 'border-border-hi text-paper-dim hover:border-orange hover:text-orange'
        }`}
      >
        {running ? <Pause size={13} strokeWidth={2.5} /> : <Play size={13} strokeWidth={2.5} />}
      </button>

      <div className="min-w-0 flex-1 py-0.5">
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
            className="no-drag w-full rounded-md bg-transparent text-xs leading-snug text-paper outline-none ring-1 ring-orange/60"
          />
        ) : (
          <p
            onDoubleClick={() => {
              setDraft(task.text)
              setEditingTask(task.id)
            }}
            className="select-text text-xs leading-snug text-paper selection:bg-orange/30"
          >
            {task.text}
          </p>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-orange">
          {running && <span>en curso</span>}
          {task.remindAt && !task.done && (
            <span className="flex items-center gap-1">
              <Bell size={9} strokeWidth={2.5} /> recordatorio
            </span>
          )}
        </div>
      </div>

      <button
        aria-label="Completar"
        onClick={() => toggleTask(task.id)}
        className="no-drag mt-0.5 grid h-5 w-5 shrink-0 place-items-center self-start rounded-md border border-border-hi text-transparent transition-colors hover:border-orange hover:text-paper-dim"
      >
        <Check size={12} strokeWidth={3} />
      </button>
    </li>
  )
}
