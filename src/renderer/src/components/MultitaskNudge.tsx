import { AlertTriangle } from 'lucide-react'

/**
 * Aviso en pantalla mientras hay varias tareas en enfoque (PLAN.md §4.3).
 * Nudge, no bloqueo: el usuario puede seguir si quiere.
 */
export default function MultitaskNudge({ count }: { count: number }): React.JSX.Element {
  return (
    <div className="no-drag flex animate-fade items-start gap-2 rounded-chip border border-orange/40 bg-orange-glow p-3 text-[11px] leading-snug text-paper">
      <AlertTriangle size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-orange" />
      <p>
        {count} tareas en enfoque. El multitasking puede bajar tu productividad hasta ~40% por el
        costo de cambiar de tarea (
        <a
          href="https://www.apa.org/topics/research/multitasking"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-orange/60 underline-offset-2 hover:text-orange"
        >
          American Psychological Association
        </a>
        ). Avanzas más rápido con una sola — pero tú decides.
      </p>
    </div>
  )
}
