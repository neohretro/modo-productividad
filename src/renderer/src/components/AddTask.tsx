import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'

interface Props {
  onAdd: (text: string) => void
  placeholder?: string
  /** Empieza colapsado como un botón "+"; se expande al hacer clic. Para el mini. */
  collapsible?: boolean
}

export default function AddTask({ onAdd, placeholder, collapsible }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(!collapsible)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (): void => {
    if (!text.trim()) return
    onAdd(text)
    setText('')
    inputRef.current?.focus()
  }

  if (collapsible && !open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="no-drag flex w-full items-center gap-2 rounded-chip px-2.5 py-1.5 text-xs text-paper-dim transition-colors hover:bg-ink-soft hover:text-paper"
      >
        <Plus size={14} strokeWidth={2} />
        Agregar tarea
      </button>
    )
  }

  return (
    <div className="no-drag flex items-center gap-2 rounded-chip border border-border bg-ink-soft px-3 py-2 focus-within:border-border-hi">
      <Plus size={15} strokeWidth={1.75} className="shrink-0 text-paper-dim" />
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape' && collapsible) setOpen(false)
        }}
        onBlur={() => {
          if (collapsible && !text.trim()) setOpen(false)
        }}
        placeholder={placeholder ?? 'Agregar tarea'}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-paper-dim/70"
      />
    </div>
  )
}
