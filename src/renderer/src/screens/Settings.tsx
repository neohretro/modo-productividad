import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ease-modo ${
        checked ? 'border-orange bg-orange-glow' : 'border-border bg-ink-glass'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ease-modo ${
          checked ? 'left-[22px] bg-orange' : 'left-0.5 bg-paper-dim'
        }`}
      />
    </button>
  )
}

export default function Settings(): React.JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const setLaunchOnStartup = useAppStore((s) => s.setLaunchOnStartup)
  const setGlobalShortcut = useAppStore((s) => s.setGlobalShortcut)
  const setMultitaskNudges = useAppStore((s) => s.setMultitaskNudges)
  const [version, setVersion] = useState('0.1.0')
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    window.modo?.getAppVersion().then(setVersion).catch(() => undefined)
  }, [])

  const onCapture = (e: React.KeyboardEvent): void => {
    e.preventDefault()
    const mods: string[] = []
    if (e.ctrlKey) mods.push('CommandOrControl')
    if (e.altKey) mods.push('Alt')
    if (e.shiftKey) mods.push('Shift')
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
    if (mods.length === 0) return
    setGlobalShortcut([...mods, key].join('+'))
    setCapturing(false)
  }

  return (
    <div className="glass flex flex-1 flex-col gap-1 rounded-card p-6">
      <h2 className="mb-4 text-xl">Ajustes</h2>

      <Row
        title="Iniciar con Windows"
        desc="Abre la app en segundo plano al encender el equipo."
      >
        <Toggle checked={settings.launchOnStartup} onChange={setLaunchOnStartup} />
      </Row>

      <Row
        title="Atajo global"
        desc="Muestra u oculta la app desde cualquier lugar."
      >
        <button
          onClick={() => setCapturing(true)}
          onKeyDown={capturing ? onCapture : undefined}
          onBlur={() => setCapturing(false)}
          className={`rounded-chip border px-3 py-1.5 text-xs tabular-nums transition-colors ${
            capturing
              ? 'border-orange text-orange'
              : 'border-border text-paper-dim hover:text-paper'
          }`}
        >
          {capturing ? 'Pulsa la combinación…' : prettyAccelerator(settings.globalShortcut)}
        </button>
      </Row>

      <Row
        title="Avisar sobre multitasking"
        desc="Cuando enfocas varias tareas a la vez, un aviso suave (nunca bloquea)."
      >
        <Toggle checked={settings.multitaskNudges} onChange={setMultitaskNudges} />
      </Row>

      <Row title="Modo mini" desc="La burbuja flotante con tus tareas y el cronómetro de enfoque.">
        <button
          onClick={() => window.modo?.enterMiniMode()}
          className="rounded-chip border border-border px-3 py-1.5 text-xs text-paper-dim hover:text-paper"
        >
          Activar ahora
        </button>
      </Row>

      <p className="mt-auto pt-6 text-xs text-paper-dim/70">
        MODO CREADOR - Productividad · v{version}
      </p>
    </div>
  )
}

function Row({
  title,
  desc,
  children
}: {
  title: string
  desc: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-4">
      <div className="pr-4">
        <p className="text-sm text-paper">{title}</p>
        <p className="text-xs text-paper-dim">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function prettyAccelerator(a: string): string {
  return a
    .replace('CommandOrControl', 'Ctrl')
    .replace('Alt', 'Alt')
    .replace(/\+/g, ' + ')
}
