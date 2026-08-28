import { useEffect } from 'react'
import { Maximize2 } from 'lucide-react'
import { elapsedMs, formatDuration } from '@shared/focus'
import { useAppStore } from '../store/useAppStore'
import { useNow } from '../hooks/useNow'
import FocusTaskRow from './FocusTaskRow'
import MultitaskNudge from './MultitaskNudge'

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
  const focusing = pending.filter((t) => t.focusStartedAt !== null)
  const anyRunning = focusing.length > 0
  const now = useNow(anyRunning)
  const focusedTotal = focusing.reduce((acc, t) => acc + elapsedMs(t, now), 0)

  // pendientes con enfoque activo primero
  const ordered = [...pending].sort(
    (a, b) => Number(Boolean(b.focusStartedAt)) - Number(Boolean(a.focusStartedAt))
  )

  return (
    <div className="drag flex h-screen w-screen p-2">
      <div className="glass-strong flex h-full w-full flex-col overflow-hidden rounded-[22px] shadow-glass">
        <header className="flex items-center justify-between px-3.5 pb-2 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-paper-dim">Enfoque</p>
            <p className="text-xs text-paper">
              {done}/{todayTasks.length} hoy
              {anyRunning && (
                <span className="text-orange"> · {formatDuration(focusedTotal)}</span>
              )}
            </p>
          </div>
          <button
            aria-label="Abrir ventana completa"
            onClick={() => window.modo?.exitMiniMode()}
            className="no-drag grid h-6 w-6 place-items-center rounded-md text-paper-dim transition-colors hover:bg-ink-glass-strong hover:text-paper"
          >
            <Maximize2 size={13} strokeWidth={1.75} />
          </button>
        </header>

        <div className="no-drag min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
          {!hydrated ? (
            <p className="px-1 py-6 text-center text-xs text-paper-dim">…</p>
          ) : focusing.length >= 2 ? (
            <MultitaskNudge count={focusing.length} />
          ) : null}

          {hydrated && pending.length === 0 ? (
            <p className="px-1 py-8 text-center text-xs text-paper-dim">
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
      </div>
    </div>
  )
}
