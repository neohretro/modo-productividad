import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'

interface Props {
  onAdd: (text: string) => void
  placeholder?: string
  /** estilo compacto para el mini (menos alto, sin borde marcado). */
  compact?: boolean
}

export default function AddTask({ onAdd, placeholder, compact }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (): void => {
    if (!text.trim()) return
    onAdd(text)
    setText('')
    inputRef.current?.focus()
  }

  return (
    <div
      className={`no-drag flex items-center gap-2 rounded-chip border transition-colors focus-within:border-orange/60 ${
        compact
          ? 'border-transparent bg-ink-soft px-3 py-1.5'
          : 'border-border bg-ink-soft px-3 py-2'
      }`}
    >
      <Plus size={15} strokeWidth={1.75} className="shrink-0 text-paper-dim" />
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder ?? 'Agregar tarea'}
        className={`flex-1 bg-transparent outline-none placeholder:text-paper-dim/70 ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      />
    </div>
  )
}
