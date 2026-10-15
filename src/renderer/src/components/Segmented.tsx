/** Selector de pestañas en píldora, con contador opcional. Mismo estilo en toda la app. */
export default function Segmented<T extends string>({
  options,
  value,
  onChange
}: {
  options: { id: T; label: string; count?: number }[]
  value: T
  onChange: (id: T) => void
}): React.JSX.Element {
  return (
    <div className="no-drag inline-flex gap-1 rounded-chip bg-ink p-1">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-xs transition-colors duration-200 ease-modo ${
              active ? 'bg-orange text-onaccent' : 'text-paper-dim hover:text-paper'
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                  active ? 'bg-onaccent/15' : 'bg-ink-soft'
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
