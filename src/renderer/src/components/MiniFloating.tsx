import { useEffect } from 'react'
import { Maximize2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import ProgressRing from './ProgressRing'
import FocusTaskRow from './FocusTaskRow'
import MultitaskNudge from './MultitaskNudge'
import CompletionToast from './CompletionToast'

// El rollover diario lo maneja solo la ventana principal; el mini recibe el
// estado ya actualizado por el broadcast store:changed.

export default function MiniFloating(): React.JSX.Element {
  const hydrated = useAppStore((s) => s.hydrated)
  const todayTasks = useAppStore((s) => s.todayTasks)
  const hydrate = useAppStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const pending = todayTasks.filter((t) => !t.done)
  const done = todayTasks.length - pending.length
  const pct = todayTasks.length === 0 ? 0 : done / todayTasks.length
  const focusing = pending.filter((t) => t.focusStartedAt !== null)

  // pendientes con enfoque activo primero
  const ordered = [...pending].sort(
    (a, b) => Number(Boolean(b.focusStartedAt)) - Number(Boolean(a.focusStartedAt))
  )

  return (
    <div className="drag flex h-screen w-screen p-2">
      <div className="glass-strong relative flex h-full w-full flex-col overflow-hidden rounded-[22px] shadow-glass">
        <header className="flex items-center justify-between px-3.5 pb-1 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-paper-dim">Enfoque</p>
          <button
            aria-label="Abrir ventana completa"
            onClick={() => window.modo?.exitMiniMode()}
            className="no-drag grid h-6 w-6 place-items-center rounded-md text-paper-dim transition-colors hover:bg-ink-glass-strong hover:text-paper"
          >
            <Maximize2 size={13} strokeWidth={1.75} />
          </button>
        </header>

        <div className="relative grid place-items-center pb-3 pt-1">
          <div className="ring-halo pointer-events-none absolute inset-0" />
          <ProgressRing
            pct={pct}
            size={140}
            stroke={6}
            label="del día"
            sub={`${done}/${todayTasks.length}`}
          />
        </div>

        <div className="no-drag min-h-0 flex-1 space-y-1.5 overflow-y-auto border-t border-border px-3 py-3">
          {hydrated && focusing.length >= 2 && <MultitaskNudge count={focusing.length} />}

          {hydrated && pending.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-paper-dim">
              {todayTasks.length === 0
                ? 'Sin tareas hoy. Ábrela para agregar.'
                : '¡Todo cerrado por hoy!'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {ordered.map((t) => (
                <FocusTaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>

        <CompletionToast compact />
      </div>
    </div>
  )
}
