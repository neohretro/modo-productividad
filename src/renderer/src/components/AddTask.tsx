import { useState } from 'react'
import { Plus } from 'lucide-react'

interface Props {
  onAdd: (text: string) => void
  placeholder?: string
}

export default function AddTask({ onAdd, placeholder }: Props): React.JSX.Element {
  const [text, setText] = useState('')

  const submit = (): void => {
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }

  return (
    <div className="no-drag flex items-center gap-2 rounded-chip border border-border bg-ink-glass px-3 py-2.5 focus-within:border-paper-dim">
      <Plus size={16} strokeWidth={1.75} className="shrink-0 text-paper-dim" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder ?? 'Agregar tarea'}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-paper-dim/70"
      />
    </div>
  )
}
