import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
}

/**
 * Menú desplegable propio (el <select> nativo no se puede tematizar: en modo
 * oscuro el popup queda claro con texto blanco). Usa las superficies del tema.
 */
export default function Dropdown({ value, options, onChange, className = '' }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={`no-drag relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-chip px-2 py-1 text-sm font-medium text-paper transition-colors hover:bg-ink-glass"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="glass-strong absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-60 overflow-y-auto rounded-chip p-1 animate-fade">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-[11px] px-2.5 py-1.5 text-left text-xs transition-colors ${
                o.value === value ? 'text-orange' : 'text-paper hover:bg-ink-glass'
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={12} strokeWidth={3} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
