import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { formatDurationLong } from '@shared/focus'
import { useAppStore } from '../store/useAppStore'

const SHOW_MS = 4500

/**
 * Aviso efímero al cerrar una tarea: "te tomó X". El tiempo es un dato que
 * aparece AL FINALIZAR, no un cronómetro visible que estrese (feedback usuario).
 */
export default function CompletionToast({
  compact = false
}: {
  compact?: boolean
}): React.JSX.Element | null {
  const recent = useAppStore((s) => s.recentCompletion)
  const clear = useAppStore((s) => s.clearRecentCompletion)
  const [shown, setShown] = useState(recent)

  useEffect(() => {
    if (!recent) return
    setShown(recent)
    const t = window.setTimeout(() => {
      setShown(null)
      clear()
    }, SHOW_MS)
    return () => window.clearTimeout(t)
  }, [recent, clear])

  if (!shown) return null

  // El div externo centra y fija los márgenes; el interno anima. Separados porque
  // `animate-rise` usa `transform: translateY`, que pisaría un `-translate-x-1/2`.
  return (
    <div
      className={`no-drag pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3 ${
        compact ? 'bottom-3' : 'bottom-6'
      }`}
    >
      <div className={`animate-rise ${compact ? 'w-full' : 'max-w-sm'}`}>
        <div className="glass-strong flex items-center gap-3 rounded-chip px-4 py-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange text-onaccent">
            <Check size={13} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-paper">{shown.text}</p>
            <p className="truncate text-xs text-paper-dim">
              Te tomó <span className="text-orange">{formatDurationLong(shown.ms)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
