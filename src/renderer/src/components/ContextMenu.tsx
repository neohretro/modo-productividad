import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'

export interface MenuPos {
  x: number
  y: number
}

export function ContextMenu({
  pos,
  onClose,
  children
}: {
  pos: MenuPos
  onClose: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [adj, setAdj] = useState(pos)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let { x, y } = pos
    if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8
    setAdj({ x: Math.max(8, x), y: Math.max(8, y) })
  }, [pos])

  useEffect(() => {
    const close = (): void => onClose()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('blur', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: 'fixed', left: adj.x, top: adj.y }}
      // `no-drag`: sin esto, en el mini (ventana sin marco) la zona del menú
      // cuenta como zona de arrastre de ventana y los clics no llegan a los items.
      className="no-drag glass-strong z-50 min-w-[196px] animate-fade rounded-chip p-1.5"
    >
      {children}
    </div>,
    document.body
  )
}

export function MenuItem({
  Icon,
  label,
  onClick,
  danger,
  trailing
}: {
  Icon?: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
  trailing?: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-1.5 text-left text-xs transition-colors ${
        danger ? 'text-orange hover:bg-orange-soft' : 'text-paper hover:bg-ink-glass'
      }`}
    >
      {Icon && <Icon size={14} strokeWidth={1.75} className="shrink-0 opacity-80" />}
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  )
}

export function MenuSep(): React.JSX.Element {
  return <div className="my-1 h-px bg-border" />
}

export function MenuLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="px-2.5 pb-1 pt-1.5 text-[9px] uppercase tracking-wide text-paper-dim">{children}</p>
  )
}
