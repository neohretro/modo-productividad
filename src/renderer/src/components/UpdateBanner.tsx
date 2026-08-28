import { Download, RefreshCw, Sparkles } from 'lucide-react'
import { useUpdate } from '../hooks/useUpdate'

/**
 * Aviso de actualización estilo "hay una nueva versión, haz clic para instalar".
 * Solo aparece cuando hay algo que hacer (disponible / descargando / lista).
 */
export default function UpdateBanner({ compact = false }: { compact?: boolean }): React.JSX.Element | null {
  const u = useUpdate()

  if (u.state === 'idle' || u.state === 'checking' || u.state === 'none' || u.state === 'error') {
    return null
  }

  const base = `no-drag ${compact ? 'mb-2 mx-3' : 'mb-2'} flex animate-rise items-center gap-2.5 rounded-chip border border-orange/50 bg-orange-soft text-paper ${
    compact ? 'px-3 py-2 text-[11px]' : 'px-4 py-2.5 text-xs'
  }`

  if (u.state === 'available') {
    return (
      <div className={base}>
        <Sparkles size={14} strokeWidth={1.75} className="shrink-0 text-orange" />
        <span className="flex-1">Nueva versión disponible ({u.version})</span>
        <button
          onClick={() => window.modo?.updater.download()}
          className="flex shrink-0 items-center gap-1 rounded-chip bg-orange px-2.5 py-1 font-medium text-onaccent"
        >
          <Download size={12} strokeWidth={2} />
          Descargar
        </button>
      </div>
    )
  }

  if (u.state === 'downloading') {
    return (
      <div className={base}>
        <RefreshCw size={14} strokeWidth={1.75} className="shrink-0 animate-spin text-orange" />
        <span className="flex-1">Descargando actualización…</span>
        <span className="shrink-0 tabular-nums text-paper-dim">{u.percent}%</span>
      </div>
    )
  }

  // ready
  return (
    <div className={base}>
      <Sparkles size={14} strokeWidth={1.75} className="shrink-0 text-orange" />
      <span className="flex-1">Actualización lista ({u.version})</span>
      <button
        onClick={() => window.modo?.updater.install()}
        className="flex shrink-0 items-center gap-1 rounded-chip bg-orange px-2.5 py-1 font-medium text-onaccent"
      >
        <RefreshCw size={12} strokeWidth={2} />
        Reiniciar e instalar
      </button>
    </div>
  )
}
