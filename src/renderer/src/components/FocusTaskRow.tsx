import { Check, Pause, Play } from 'lucide-react'
import type { Task } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { useTaskMenu } from '../hooks/useTaskMenu'

/**
 * Fila de tarea con enfoque: ▶ para empezar a trabajarla, ⏸ para pausar,
 * ✓ para completar. El tiempo se registra en silencio — no hay cronómetro
 * visible (evita estrés); el dato aparece al finalizar y en el Resumen.
 */
export default function FocusTaskRow({ task }: { task: Task }): React.JSX.Element {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const toggleFocus = useAppStore((s) => s.toggleFocus)
  const { onContextMenu, menu } = useTaskMenu(task)
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
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center self-start rounded-full border transition-colors ${
          running
            ? 'border-orange bg-orange text-onaccent'
            : 'border-border-hi text-paper-dim hover:border-orange hover:text-orange'
        }`}
      >
        {running ? <Pause size={13} strokeWidth={2.5} /> : <Play size={13} strokeWidth={2.5} />}
      </button>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="select-text text-xs leading-snug text-paper selection:bg-orange/30">
          {task.text}
        </p>
        {running && <p className="mt-0.5 text-[10px] text-orange">en curso</p>}
      </div>

      <button
        aria-label="Completar"
        onClick={() => toggleTask(task.id)}
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center self-start rounded-md border border-border-hi text-transparent transition-colors hover:border-orange hover:text-paper-dim"
      >
        <Check size={12} strokeWidth={3} />
      </button>
    </li>
  )
}
