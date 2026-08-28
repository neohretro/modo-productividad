interface Props {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  strong?: boolean
  children?: React.ReactNode
}

export default function StatCard({
  label,
  value,
  hint,
  strong,
  children
}: Props): React.JSX.Element {
  return (
    <div
      className={`flex flex-1 flex-col justify-between rounded-card p-5 ${
        strong ? 'glass-strong' : 'glass'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-paper-dim">{label}</p>
      <div className="mt-2">
        <p className="font-display text-3xl leading-none tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-paper-dim">{hint}</p>}
        {children}
      </div>
    </div>
  )
}
