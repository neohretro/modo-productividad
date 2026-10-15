import { useRef, useState } from 'react'
import { Check, ChevronDown, FolderKanban } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ContextMenu, MenuItem, MenuSep, type MenuPos } from './ContextMenu'

/**
 * Selector compacto de la etiqueta de proyecto (para crear tareas). Abre un menú
 * con "Sin proyecto" + los proyectos existentes.
 */
export default function ProjectPicker({
  value,
  onChange,
  className = '',
  emptyLabel = 'Sin proyecto'
}: {
  value: string | null
  onChange: (projectId: string | null) => void
  className?: string
  /** texto del botón cuando no hay etiqueta elegida. */
  emptyLabel?: string
}): React.JSX.Element {
  const projects = useAppStore((s) => s.projects)
  const [pos, setPos] = useState<MenuPos | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const current = projects.find((p) => p.id === value)

  const open = (): void => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left, y: r.bottom + 4 })
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={open}
        title="Etiqueta de proyecto"
        className={`no-drag inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
          current
            ? 'border-orange/40 bg-orange-soft text-orange'
            : 'border-border-hi text-paper-dim hover:border-orange/50 hover:text-paper'
        } ${className}`}
      >
        <FolderKanban size={10} strokeWidth={2} className="shrink-0" />
        <span className="truncate">{current ? current.name : emptyLabel}</span>
        <ChevronDown size={9} strokeWidth={2.25} className="shrink-0 opacity-70" />
      </button>

      {pos && (
        <ContextMenu pos={pos} onClose={() => setPos(null)}>
          <MenuItem
            label="Sin proyecto"
            onClick={() => {
              onChange(null)
              setPos(null)
            }}
            trailing={value === null ? <Check size={12} strokeWidth={3} className="text-orange" /> : null}
          />
          {projects.length > 0 && <MenuSep />}
          {projects.map((p) => (
            <MenuItem
              key={p.id}
              Icon={FolderKanban}
              label={p.name}
              onClick={() => {
                onChange(p.id)
                setPos(null)
              }}
              trailing={value === p.id ? <Check size={12} strokeWidth={3} className="text-orange" /> : null}
            />
          ))}
        </ContextMenu>
      )}
    </>
  )
}
