import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
 * Menú desplegable propio (el <select> nativo no se tematiza). El panel se
 * renderiza en un portal con posición fija para que no lo recorte el
 * `overflow-hidden` de la burbuja mini.
 */
export default function Dropdown({
  value,
  options,
  onChange,
  className = ''
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value) ?? options[0]

  useLayoutEffect(() => {
    if (open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent): void => {
      const t = e.target as Node
      if (
        !triggerRef.current?.contains(t) &&
        !panelRef.current?.contains(t)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`no-drag relative ${className}`}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-chip px-2 py-1 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: rect.left,
              top: rect.bottom + 4,
              width: Math.max(rect.width, 150)
            }}
            className="no-drag z-50 max-h-60 animate-fade overflow-y-auto rounded-chip border border-border-hi bg-ink-glass-strong p-1 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]"
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-[11px] px-2.5 py-1.5 text-left text-xs transition-colors ${
                  o.value === value ? 'text-orange' : 'text-paper hover:bg-ink-soft'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={12} strokeWidth={3} className="shrink-0" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
