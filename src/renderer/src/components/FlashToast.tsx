import { useAppStore } from '../store/useAppStore'

/** Confirmación efímera y discreta ("Copiado", "Movida a mañana"…). */
export default function FlashToast(): React.JSX.Element | null {
  const flash = useAppStore((s) => s.flash)
  if (!flash) return null
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 animate-rise">
      <div className="glass-strong rounded-pill px-3.5 py-1.5 text-xs text-paper">{flash}</div>
    </div>
  )
}
