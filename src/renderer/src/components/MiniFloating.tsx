import { useEffect } from 'react'
import { Maximize2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from './ProgressRing'

// El rollover diario lo maneja solo la ventana principal; el mini recibe el
// estado ya actualizado por el broadcast store:changed.

/**
 * Burbuja de vidrio flotante (PLAN.md §4): solo el anillo de avance de "Hoy",
 * arrastrable, siempre visible. Se sincroniza con la ventana principal.
 */
export default function MiniFloating(): React.JSX.Element {
  const hydrated = useAppStore((s) => s.hydrated)
  const todayTasks = useAppStore((s) => s.todayTasks)
  const hydrate = useAppStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const total = todayTasks.length
  const done = todayTasks.filter((t) => t.done).length
  const pct = total === 0 ? 0 : done / total
  const pending = total - done

  return (
    <div className="drag flex h-screen w-screen items-center justify-center p-2">
      <div className="glass-strong relative grid h-full w-full place-items-center rounded-[26px] shadow-glass">
        <button
          aria-label="Abrir ventana completa"
          onClick={() => window.modo?.exitMiniMode()}
          className="no-drag absolute right-2.5 top-2.5 text-paper-dim transition-colors hover:text-paper"
        >
          <Maximize2 size={13} strokeWidth={1.75} />
        </button>

        {hydrated ? (
          <ProgressRing
            pct={pct}
            size={150}
            stroke={6}
            label={pending === 0 && total > 0 ? '¡listo!' : `faltan ${pending}`}
          />
        ) : (
          <span className="text-xs text-paper-dim">…</span>
        )}
      </div>
    </div>
  )
}
