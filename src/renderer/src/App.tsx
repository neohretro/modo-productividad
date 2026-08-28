import { useEffect } from 'react'
import { Minus, PictureInPicture2, X } from 'lucide-react'
import { useAppStore } from './store/useAppStore'
import BottomNav from './components/BottomNav'
import CompletionToast from './components/CompletionToast'
import Today from './screens/Today'
import Projects from './screens/Projects'
import Summary from './screens/Summary'
import Settings from './screens/Settings'

function WindowControls(): React.JSX.Element {
  const btn =
    'no-drag grid h-6 w-6 place-items-center rounded-md text-paper-dim transition-colors duration-200 hover:bg-ink-glass-strong hover:text-paper'
  return (
    <div className="no-drag flex items-center gap-1">
      <button aria-label="Modo mini" className={btn} onClick={() => window.modo?.enterMiniMode()}>
        <PictureInPicture2 size={14} strokeWidth={1.75} />
      </button>
      <button aria-label="Minimizar" className={btn} onClick={() => window.modo?.minimizeWindow()}>
        <Minus size={15} strokeWidth={1.75} />
      </button>
      <button
        aria-label="Cerrar"
        className={`${btn} hover:!bg-orange hover:!text-ink`}
        onClick={() => window.modo?.closeWindow()}
      >
        <X size={15} strokeWidth={1.75} />
      </button>
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
    <div className="relative flex h-full flex-col bg-ink/95 p-4">
      <header className="drag flex items-center justify-between px-2 py-1">
        <span className="text-xs tracking-widest text-paper-dim">
          MODO CREADOR · PRODUCTIVIDAD
        </span>
        <WindowControls />
      </header>

      <main className="flex flex-1 flex-col overflow-hidden p-2">
        {hydrated ? (
          <div key={screen} className="flex flex-1 animate-rise flex-col overflow-hidden">
            <Screen />
          </div>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-paper-dim">Cargando…</div>
        )}
      </main>

      <BottomNav />
      <CompletionToast />
    </div>
  )
}
