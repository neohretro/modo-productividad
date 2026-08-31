import { FolderKanban } from 'lucide-react'

/** Etiqueta que marca una tarea como "de proyecto" cuando aparece en Hoy. */
export default function ProjectChip({ name, className = '' }: { name: string; className?: string }): React.JSX.Element {
  return (
    <span
      className={`inline-flex max-w-[10rem] items-center gap-1 rounded-full border border-border-hi bg-ink-glass px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-paper-dim ${className}`}
      title={`Tarea del proyecto ${name}`}
    >
      <FolderKanban size={9} strokeWidth={2} className="shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  )
}
