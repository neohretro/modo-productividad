import { useLayoutEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'

interface Props {
  onAdd: (text: string) => void
  placeholder?: string
  /** estilo compacto para el mini (menos alto, sin borde marcado). */
  compact?: boolean
  /**
   * Para espacios angostos (p. ej. las columnas de la vista Semana): el texto
   * salta de línea y el campo crece, en vez de quedarse en una sola línea
   * donde no se ve lo que escribes.
   */
  wrap?: boolean
}

export default function AddTask({ onAdd, placeholder, compact, wrap }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  // El textarea crece con el contenido (hasta ~6 líneas, luego scroll).
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`
  }, [text])

  const submit = (): void => {
    if (!text.trim()) return
    onAdd(text)
    setText('')
    ;(wrap ? areaRef.current : inputRef.current)?.focus()
  }

  const textSize = compact ? 'text-xs' : 'text-sm'

  return (
    <div
      className={`no-drag flex gap-2 rounded-chip border transition-colors focus-within:border-orange/60 ${
        wrap ? 'items-start' : 'items-center'
      } ${
        compact
          ? ('border-transparent bg-ink-soft py-1.5 ' + (wrap ? 'px-2' : 'px-3'))
          : 'border-border bg-ink-soft px-3 py-2'
      }`}
    >
      <Plus
        size={15}
        strokeWidth={1.75}
        className={`shrink-0 text-paper-dim ${wrap ? 'mt-px' : ''}`}
      />
      {wrap ? (
        <textarea
          ref={areaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\n/g, ' '))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder ?? 'Agregar tarea'}
          className={`min-w-0 flex-1 resize-none overflow-y-auto bg-transparent leading-snug outline-none placeholder:text-paper-dim/70 ${textSize}`}
        />
      ) : (
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={placeholder ?? 'Agregar tarea'}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-paper-dim/70 ${textSize}`}
        />
      )}
    </div>
  )
}
