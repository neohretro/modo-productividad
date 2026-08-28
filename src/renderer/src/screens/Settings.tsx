import { useEffect, useState } from 'react'
import {
  Keyboard,
  Layers,
  type LucideIcon,
  Monitor,
  Moon,
  PictureInPicture2,
  Power,
  RefreshCw,
  Sun
} from 'lucide-react'
import type { ThemePref } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import { useUpdate } from '../hooks/useUpdate'

const THEMES: { value: ThemePref; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor }
]

export default function Settings(): React.JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const setLaunchOnStartup = useAppStore((s) => s.setLaunchOnStartup)
  const setGlobalShortcut = useAppStore((s) => s.setGlobalShortcut)
  const setMultitaskNudges = useAppStore((s) => s.setMultitaskNudges)
  const setTheme = useAppStore((s) => s.setTheme)
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
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1 pb-2">
      <h2 className="text-xl">Ajustes</h2>

      <Group label="Apariencia">
        <Card Icon={Sun} title="Tema" desc="Claro, oscuro o el que tengas en el sistema.">
          <div className="flex gap-1 rounded-chip bg-ink p-1">
            {THEMES.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-1.5 rounded-[12px] px-2.5 py-1.5 text-xs transition-colors ease-modo ${
                  settings.theme === value
                    ? 'bg-orange text-onaccent'
                    : 'text-paper-dim hover:text-paper'
                }`}
              >
                <Icon size={13} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>
        </Card>
      </Group>

      <Group label="Sistema">
        <Card
          Icon={Power}
          title="Iniciar con Windows"
          desc="Abre la app en segundo plano al encender el equipo."
        >
          <Toggle checked={settings.launchOnStartup} onChange={setLaunchOnStartup} />
        </Card>
        <Card
          Icon={Keyboard}
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
                : 'border-border-hi text-paper-dim hover:text-paper'
            }`}
          >
            {capturing ? 'Pulsa la combinación…' : prettyAccelerator(settings.globalShortcut)}
          </button>
        </Card>
      </Group>

      <Group label="Enfoque">
        <Card
          Icon={Layers}
          title="Avisar sobre multitasking"
          desc="Cuando enfocas varias tareas a la vez, un aviso suave (nunca bloquea)."
        >
          <Toggle checked={settings.multitaskNudges} onChange={setMultitaskNudges} />
        </Card>
        <Card
          Icon={PictureInPicture2}
          title="Modo mini"
          desc="La burbuja flotante con tus tareas y el cronómetro de enfoque."
        >
          <button
            onClick={() => window.modo?.enterMiniMode()}
            className="rounded-chip border border-border-hi px-3 py-1.5 text-xs text-paper-dim transition-colors hover:border-orange hover:text-orange"
          >
            Activar ahora
          </button>
        </Card>
      </Group>

      <Group label="Acerca de">
        <Card
          Icon={RefreshCw}
          title="Actualizaciones"
          desc={`Estás en la versión ${version}. La app se actualiza sola.`}
        >
          <UpdateControl />
        </Card>
      </Group>

      <p className="pt-2 text-center text-[11px] text-paper-dim/70">
        MODO CREADOR - Productividad · v{version}
      </p>
    </div>
  )
}

function UpdateControl(): React.JSX.Element {
  const u = useUpdate()
  const label =
    u.state === 'checking'
      ? 'Comprobando…'
      : u.state === 'available'
        ? `Descargar ${u.version}`
        : u.state === 'downloading'
          ? `Descargando ${u.percent}%`
          : u.state === 'ready'
            ? 'Reiniciar e instalar'
            : u.state === 'none'
              ? 'Estás al día'
              : 'Buscar actualizaciones'

  const onClick = (): void => {
    if (u.state === 'available') window.modo?.updater.download()
    else if (u.state === 'ready') window.modo?.updater.install()
    else window.modo?.updater.check()
  }

  return (
    <button
      onClick={onClick}
      disabled={u.state === 'checking' || u.state === 'downloading'}
      className="rounded-chip border border-border-hi px-3 py-1.5 text-xs text-paper-dim transition-colors hover:border-orange hover:text-orange disabled:opacity-60"
    >
      {label}
    </button>
  )
}

function Group({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2.5">
      <p className="px-1 text-[10px] uppercase tracking-[0.15em] text-paper-dim">{label}</p>
      {children}
    </section>
  )
}

function Card({
  Icon,
  title,
  desc,
  children
}: {
  Icon: LucideIcon
  title: string
  desc: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="glass flex items-center gap-4 rounded-card p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-orange-soft text-orange">
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-paper">{title}</p>
        <p className="text-xs leading-snug text-paper-dim">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

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
        checked ? 'border-orange bg-orange' : 'border-border-hi bg-ink'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ease-modo ${
          checked ? 'left-[22px] bg-onaccent' : 'left-0.5 bg-paper-dim'
        }`}
      />
    </button>
  )
}

function prettyAccelerator(a: string): string {
  return a.replace('CommandOrControl', 'Ctrl').replace(/\+/g, ' + ')
}
