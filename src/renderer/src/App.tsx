import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

/**
 * Fase 0 — shell visual. Prueba que el stack completo corre:
 * ventana glass sin marco, tokens de color/tipografía, Framer Motion.
 * El bento grid real y el ProgressRing definitivo llegan en Fase 1/3.
 */

function WindowControls(): React.JSX.Element {
  return (
    <div className="no-drag flex items-center gap-2">
      <button
        aria-label="Minimizar"
        onClick={() => window.modo?.minimizeWindow()}
        className="h-3 w-3 rounded-full bg-paper-dim transition-colors duration-200 hover:bg-paper"
      />
      <button
        aria-label="Cerrar"
        onClick={() => window.modo?.closeWindow()}
        className="h-3 w-3 rounded-full bg-paper-dim transition-colors duration-200 hover:bg-orange"
      />
    </div>
  )
}

/** Teaser del elemento de firma: un punto naranja orbitando el anillo. */
function OrbitRing(): React.JSX.Element {
  const size = 200
  const r = 84
  const c = size / 2
  const pct = 0.62

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--orange)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * r}
          strokeDashoffset={2 * Math.PI * r * (1 - pct)}
          style={{ filter: 'drop-shadow(0 0 8px var(--orange-glow))' }}
        />
      </svg>
      <motion.span
        className="absolute h-3.5 w-3.5 rounded-full bg-orange"
        style={{ boxShadow: '0 0 16px var(--orange)', top: c - r - 7, left: c - 7 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        // el punto orbita alrededor del centro del anillo
        transformTemplate={({ rotate }) => `rotate(${rotate}) translateY(0px)`}
      />
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl">{Math.round(pct * 100)}%</span>
        <span className="text-xs text-paper-dim">del día</span>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.modo?.getAppVersion().then(setVersion).catch(() => undefined)
  }, [])

  const hour = new Date().getHours()
  const greeting =
    hour < 6 ? 'Aún despierto' : hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="flex h-full flex-col bg-ink/95 p-4">
      {/* barra de título propia */}
      <header className="drag flex items-center justify-between px-2 py-1">
        <span className="text-xs tracking-widest text-paper-dim">
          MODO CREADOR · PRODUCTIVIDAD
        </span>
        <WindowControls />
      </header>

      <main className="grid flex-1 grid-cols-12 gap-4 p-2">
        <section className="glass col-span-12 flex items-center justify-between rounded-card p-6">
          <div>
            <h1 className="text-2xl">{greeting}.</h1>
            <p className="text-sm text-paper-dim">
              {new Date().toLocaleDateString('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
          </div>
          {/* la esquina activa naranja del logo */}
          <div className="h-6 w-6 rounded-tr-card border-r-2 border-t-2 border-orange" />
        </section>

        <section className="glass col-span-7 grid place-items-center rounded-card p-6">
          <OrbitRing />
        </section>

        <div className="col-span-5 flex flex-col gap-4">
          <div className="glass flex-1 rounded-card p-6">
            <p className="text-sm text-paper-dim">Tareas completadas</p>
            <p className="font-display text-3xl">0 / 0</p>
          </div>
          <div className="glass flex-1 rounded-card p-6">
            <p className="text-sm text-paper-dim">Racha</p>
            <p className="font-display text-3xl">0 días</p>
          </div>
          <div className="glass-strong flex-1 rounded-card p-6">
            <p className="text-sm text-paper-dim">Últimos 7 días</p>
            <div className="mt-3 flex h-10 items-end gap-1.5">
              {[3, 5, 2, 6, 4, 5, 1].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-orange/70"
                  style={{ height: `${v * 14}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="px-4 py-1 text-right text-[10px] text-paper-dim">
        Fase 0 · v{version || '0.1.0'}
      </footer>
    </div>
  )
}
