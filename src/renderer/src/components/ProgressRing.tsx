import { useEffect, useRef, useState } from 'react'

interface Props {
  /** 0..1 */
  pct: number
  label?: string
  sub?: string
  size?: number
  stroke?: number
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const DUR = 850

/**
 * Elemento de firma (PLAN.md §3, Brand OS §34 "línea de progreso"):
 * anillo de avance con un punto naranja que ORBITA el anillo mientras
 * sube el porcentaje. No es un donut estático.
 *
 * La animación va por transición CSS (transform + stroke-dashoffset), no por
 * librería: es la pieza más visible y tiene que ser 100% fiable.
 */
export default function ProgressRing({
  pct,
  label,
  sub,
  size = 220,
  stroke = 8
}: Props): React.JSX.Element {
  const dotR = 7
  const pad = dotR + 5
  const r = size / 2 - pad - stroke / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r

  const target = clamp01(pct)
  const shown = useCountUp(target)

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border-hi)" strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--orange)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - target)}
          style={{
            transition: `stroke-dashoffset ${DUR}ms ${EASE}`,
            filter: 'drop-shadow(0 0 6px var(--orange-glow))'
          }}
        />
      </svg>

      {/* el punto orbita: un contenedor centrado que rota, con el punto al radio r */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `rotate(${target * 360}deg)`,
          transition: `transform ${DUR}ms ${EASE}`
        }}
      >
        <span
          className="absolute rounded-full bg-orange"
          style={{
            width: dotR * 2,
            height: dotR * 2,
            left: c - dotR,
            top: c - r - dotR,
            opacity: target <= 0 ? 0 : 1,
            boxShadow: '0 0 14px var(--orange), 0 0 4px var(--orange)'
          }}
        />
      </div>

      <div className="pointer-events-none absolute flex flex-col items-center leading-none">
        <span
          className="font-display tabular-nums"
          style={{ fontSize: Math.round(size * 0.2), lineHeight: 1 }}
        >
          {shown}
          <span style={{ fontSize: Math.round(size * 0.11) }}>%</span>
        </span>
        {label && (
          <span
            className="mt-1.5 max-w-[85%] truncate text-paper-dim"
            style={{ fontSize: Math.max(10, Math.round(size * 0.082)) }}
          >
            {label}
          </span>
        )}
        {sub && (
          <span
            className="text-paper-dim/70"
            style={{ fontSize: Math.max(9, Math.round(size * 0.068)) }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

/** Cuenta ascendente hacia `target` (0..1) → entero 0..100, en ~DUR ms. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(Math.round(target * 100))
  const fromRef = useRef(value)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = fromRef.current
    const to = Math.round(target * 100)
    if (from === to) return
    const start = performance.now()

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / DUR)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      const next = Math.round(from + (to - from) * eased)
      setValue(next)
      fromRef.current = next
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    // red de seguridad si rAF se estrangula (pestaña oculta): aterrizar en el valor final
    const settle = window.setTimeout(() => {
      setValue(to)
      fromRef.current = to
    }, DUR + 120)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.clearTimeout(settle)
    }
  }, [target])

  return value
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}
