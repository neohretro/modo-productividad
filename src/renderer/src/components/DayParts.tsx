import { useRef, useState } from 'react'
import { ArrowUp, Bell, Check, FolderKanban, GripVertical, Plus, X } from 'lucide-react'
import type { Task } from '@shared/types'
import { focusPhase } from '@shared/focus'
import { projectNameOf, useAppStore } from '../store/useAppStore'
import { useTaskMenu } from '../hooks/useTaskMenu'
import ProjectPicker from './ProjectPicker'

/**
 * Agregar tarea a un día. Cerrado es un botón fantasma discreto; abierto es una
 * tarjeta con campo que salta de línea, etiqueta de proyecto y botón de enviar.
 */
export function DayComposer({
  iso,
  startOpen = false
}: {
  iso: string
  startOpen?: boolean
}): React.JSX.Element {
  const addTask = useAppStore((s) => s.addTask)
  const [open, setOpen] = useState(startOpen)
  const [text, setText] = useState('')
  const [label, setLabel] = useState<string | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const fit = (el: HTMLTextAreaElement): void => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const submit = (): void => {
    if (!text.trim()) return
    addTask(text, { projectId: label, date: iso })
    setText('')
    requestAnimationFrame(() => {
      if (areaRef.current) {
        fit(areaRef.current)
        areaRef.current.focus()
      }
    })
  }

  const close = (): void => {
    setOpen(false)
    setText('')
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => areaRef.current?.focus())
        }}
        className="no-drag group mt-2 flex w-full shrink-0 items-center justify-center gap-1.5 rounded-chip border border-dashed border-border-hi py-1.5 text-[11px] text-paper-dim transition-all duration-200 ease-modo hover:border-orange hover:bg-orange-soft hover:text-orange"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-ink-soft transition-colors group-hover:bg-orange group-hover:text-onaccent">
          <Plus size={10} strokeWidth={2.5} />
        </span>
        Agregar
      </button>
    )
  }

  return (
    <div className="no-drag relative mt-2 flex shrink-0 animate-rise flex-col gap-1.5 rounded-chip border border-orange/60 bg-ink-glass-strong p-2 shadow-[0_8px_22px_-12px_rgba(236,122,0,0.55)]">
      <button
        onClick={close}
        aria-label="Cerrar"
        title="Cerrar (Esc)"
        className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full text-paper-dim transition-colors hover:bg-ink-soft hover:text-paper"
      >
        <X size={10} strokeWidth={2.5} />
      </button>
      <textarea
        ref={areaRef}
        autoFocus
        rows={2}
        value={text}
        onChange={(e) => {
          setText(e.target.value.replace(/\n/g, ' '))
          fit(e.currentTarget)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape') {
            close()
          }
        }}
        placeholder="¿Qué vas a hacer?"
        className="w-full resize-none bg-transparent pr-4 text-xs leading-snug text-paper outline-none placeholder:text-paper-dim/70"
      />
      <div className="flex items-center justify-between gap-1">
        <ProjectPicker
          value={label}
          onChange={setLabel}
          emptyLabel="Proyecto"
          className="min-w-0"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Agregar tarea"
          title="Agregar (Enter)"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange text-onaccent transition-all duration-150 hover:scale-105 disabled:scale-100 disabled:opacity-35"
        >
          <ArrowUp size={13} strokeWidth={2.75} />
        </button>
      </div>
    </div>
  )
}

export function DayTask({
  task,
  onDragStart,
  onDragEnd
}: {
  task: Task
  onDragStart: () => void
  onDragEnd: () => void
}): React.JSX.Element {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const projectName = useAppStore((s) => projectNameOf(s, task))
  const { onContextMenu, menu } = useTaskMenu(task)
  const phase = focusPhase(task)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      className={`group flex cursor-grab items-start gap-1.5 rounded-[10px] border px-1.5 py-1.5 transition-colors active:cursor-grabbing ${
        phase === 'running'
          ? 'border-orange/50 bg-orange-glow'
          : phase === 'paused'
            ? 'border-orange/25 bg-ink-soft'
            : 'border-border bg-ink-soft hover:border-border-hi'
      } ${task.done ? 'opacity-60' : ''}`}
    >
      {menu}
      <button
        aria-label={task.done ? 'Marcar pendiente' : 'Completar'}
        onClick={() => toggleTask(task.id)}
        className={`mt-px grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition-colors ${
          task.done
            ? 'border-orange bg-orange text-onaccent'
            : 'border-border-hi hover:border-orange'
        }`}
      >
        {task.done && <Check size={9} strokeWidth={3.5} />}
      </button>
      <div className="min-w-0 flex-1">
        <span
          className={`line-clamp-3 select-text text-[10px] leading-tight ${
            task.done ? 'text-paper-dim line-through' : 'text-paper'
          }`}
        >
          {task.text}
          {task.remindAt && !task.done && (
            <Bell size={8} strokeWidth={2.5} className="ml-1 inline -translate-y-px text-orange" />
          )}
        </span>
        {projectName && (
          <span className="mt-0.5 flex items-center gap-0.5 text-[8px] uppercase tracking-wide text-paper-dim">
            <FolderKanban size={7} strokeWidth={2.25} className="shrink-0" />
            <span className="truncate">{projectName}</span>
          </span>
        )}
      </div>
    </div>
  )
}

/** Tarea suelta en la bandeja "Sin día asignado": se arrastra a un día. */
export function LooseChip({
  task,
  onDragStart,
  onDragEnd
}: {
  task: Task
  onDragStart: () => void
  onDragEnd: () => void
}): React.JSX.Element {
  const projectName = useAppStore((s) => projectNameOf(s, task))
  const { onContextMenu, menu } = useTaskMenu(task)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
      title={task.text}
      className="flex max-w-[320px] min-w-0 cursor-grab items-center gap-1.5 rounded-chip border border-border-hi bg-ink-soft px-2 py-1 text-[11px] text-paper transition-colors hover:border-orange active:cursor-grabbing"
    >
      {menu}
      <GripVertical size={11} strokeWidth={2} className="shrink-0 text-paper-dim" />
      <span className="min-w-0 truncate">{task.text}</span>
      {projectName && (
        <span className="max-w-[84px] shrink-0 truncate rounded-full bg-ink-glass px-1.5 py-px text-[8px] uppercase tracking-wide text-paper-dim">
          {projectName}
        </span>
      )}
    </div>
  )
}
