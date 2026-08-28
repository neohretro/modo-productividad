import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from './store/useAppStore'
import BottomNav from './components/BottomNav'
import Today from './screens/Today'
import Projects from './screens/Projects'
import Summary from './screens/Summary'
import Settings from './screens/Settings'

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

const SCREENS = {
  today: Today,
  projects: Projects,
  summary: Summary,
  settings: Settings
} as const

export default function App(): React.JSX.Element {
  const hydrated = useAppStore((s) => s.hydrated)
  const screen = useAppStore((s) => s.screen)
  const hydrate = useAppStore((s) => s.hydrate)
  const checkRollover = useAppStore((s) => s.checkRollover)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Rollover si la app queda abierta y cruza la medianoche, o al recuperar foco.
  useEffect(() => {
    if (!hydrated) return
    const onFocus = (): void => checkRollover()
    window.addEventListener('focus', onFocus)
    const id = window.setInterval(checkRollover, 60_000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(id)
    }
  }, [hydrated, checkRollover])

  const Screen = SCREENS[screen]

  return (
    <div className="flex h-full flex-col bg-ink/95 p-4">
      <header className="drag flex items-center justify-between px-2 py-1">
        <span className="text-xs tracking-widest text-paper-dim">
          MODO CREADOR · PRODUCTIVIDAD
        </span>
        <WindowControls />
      </header>

      <main className="flex flex-1 flex-col overflow-hidden p-2">
        {hydrated ? (
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Screen />
          </motion.div>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-paper-dim">Cargando…</div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
