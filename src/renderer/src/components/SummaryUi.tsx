/** Piezas visuales compartidas por las tarjetas del Resumen. */

export function Card({
  title,
  hint,
  children
}: {
  title?: string
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="glass h-full rounded-card p-5">
      {title && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-sm">{title}</h3>
          {hint && <span className="truncate text-[10px] text-paper-dim">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Bar({ pct, strong = true }: { pct: number; strong?: boolean }): React.JSX.Element {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-modo ${
          strong ? 'bg-orange' : 'bg-orange/55'
        }`}
        style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.round(pct * 100))}%` }}
      />
    </div>
  )
}
