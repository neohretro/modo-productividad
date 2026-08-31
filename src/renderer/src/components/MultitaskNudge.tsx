import { AlertTriangle } from 'lucide-react'

/**
 * Aviso compacto (una línea) mientras hay varias tareas en enfoque. El texto
 * completo va en la notificación de Windows; aquí solo un recordatorio discreto
 * que no le quita espacio a la lista. Toca para leer el estudio.
 */
export default function MultitaskNudge({ count }: { count: number }): React.JSX.Element {
  return (
    <a
      href="https://www.apa.org/topics/research/multitasking"
      target="_blank"
      rel="noreferrer"
      title={
        `${count} tareas en enfoque a la vez. El multitasking puede bajar la ` +
        'productividad hasta ~40% por el costo de cambiar de tarea ' +
        '(American Psychological Association). Toca para leer más.'
      }
      className="no-drag flex w-fit max-w-full animate-fade items-center gap-1.5 rounded-full border border-orange/40 bg-orange-glow px-2.5 py-0.5 text-[10px] text-orange transition-colors hover:bg-orange-soft"
    >
      <AlertTriangle size={10} strokeWidth={2.25} className="shrink-0" />
      <span className="truncate">{count} a la vez · cambiar cuesta ~40%</span>
    </a>
  )
}
