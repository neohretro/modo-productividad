import { useEffect } from 'react'
import { Minimize2, Minus } from 'lucide-react'
import { useAppStore } from './store/useAppStore'
import { useTheme } from './theme'
import BottomNav from './components/BottomNav'
import CompletionToast from './components/CompletionToast'
import FlashToast from './components/FlashToast'
import UpdateBanner from './components/UpdateBanner'
import Today from './screens/Today'
import Calendar from './screens/Calendar'
import Projects from './screens/Projects'
import Summary from './screens/Summary'
import Settings from './screens/Settings'

function WindowControls(): React.JSX.Element {
  const btn =
    'no-drag grid h-7 w-7 place-items-center rounded-lg text-paper-dim transition-colors duration-200 hover:bg-ink-glass-strong hover:text-paper'
  return (
    <div className="no-drag flex items-center gap-1">
      <button aria-label="Minimizar" className={btn} onClick={() => window.modo?.minimizeWindow()}>
        <Minus size={15} strokeWidth={1.75} />
      </button>
      <button
        aria-label="Volver al mini"
        title="Volver al mini"
        className={btn}
        onClick={() => window.modo?.closeWindow()}
      >
        <Minimize2 size={13} strokeWidth={1.75} />
      </button>
    </div>
  )
}

const SCREENS = {
  today: Today,
  week: Calendar,
  projects: Projects,
  summary: Summary,
  settings: Settings
} as const

export default function App(): React.JSX.Element {
  const hydrated = useAppStore((s) => s.hydrated)
  const screen = useAppStore((s) => s.screen)
  const hydrate = useAppStore((s) => s.hydrate)
  const checkRollover = useAppStore((s) => s.checkRollover)
  useTheme()

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
    <div className="relative flex h-full flex-col overflow-hidden bg-ink px-5 pb-3 pt-2.5">
      <header className="drag flex items-center justify-between px-1 pb-2">
        <span className="text-[10px] font-medium tracking-[0.2em] text-paper-dim">
          MODO CREADOR · PRODUCTIVIDAD
        </span>
        <WindowControls />
      </header>

      <UpdateBanner />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {hydrated ? (
          <div key={screen} className="flex min-h-0 flex-1 animate-fade flex-col overflow-hidden">
            <Screen />
          </div>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-paper-dim">Cargando…</div>
        )}
      </main>

      <BottomNav />
      <CompletionToast />
      <FlashToast />
    </div>
  )
}
