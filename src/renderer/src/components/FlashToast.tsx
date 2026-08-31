import { useAppStore } from '../store/useAppStore'

/** Confirmación efímera y discreta ("Copiado", "Movida a mañana"…). */
export default function FlashToast(): React.JSX.Element | null {
  const flash = useAppStore((s) => s.flash)
  if (!flash) return null
  // Externo: centra y fija márgenes. Interno: anima (translateY, que pisaría un
  // -translate-x-1/2, por eso van separados).
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div className="animate-rise">
        <div className="glass-strong max-w-full truncate rounded-pill px-3.5 py-1.5 text-xs text-paper">
          {flash}
        </div>
      </div>
    </div>
  )
}
