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

  return (
    <div
      className={`no-drag pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 animate-rise ${
        compact ? 'bottom-3 w-[calc(100%-24px)]' : 'bottom-6 w-auto max-w-sm'
      }`}
    >
      <div className="glass-strong flex items-center gap-3 rounded-chip px-4 py-3 shadow-glass">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange text-ink">
          <Check size={13} strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-paper">{shown.text}</p>
          <p className="text-xs text-paper-dim">
            Te tomó <span className="text-orange">{formatDurationLong(shown.ms)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
