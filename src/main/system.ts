import { app, globalShortcut } from 'electron'
import { toggleVisibility } from './windows'

/** Inicio automático con el sistema (Windows / macOS), en segundo plano. */
export function applyLoginItem(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    args: ['--hidden']
  })
}

/** ¿Se arrancó desde el login item? Entonces no mostrar la ventana. */
export function startedHidden(): boolean {
  return process.argv.includes('--hidden')
}

let registered: string | null = null

/** (Re)registra el atajo global para mostrar/ocultar. Devuelve si tuvo éxito. */
export function applyGlobalShortcut(accelerator: string): boolean {
  if (registered) {
    globalShortcut.unregister(registered)
    registered = null
  }
  if (!accelerator) return true
  try {
    const ok = globalShortcut.register(accelerator, toggleVisibility)
    if (ok) registered = accelerator
    return ok
  } catch {
    return false
  }
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
  registered = null
}
