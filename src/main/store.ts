import { BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import { INITIAL_STATE, STATE_VERSION, type AppSettings, type PersistedState } from '../shared/types'
import { normalizeState } from '../shared/focus'

interface Schema {
  state: PersistedState
  /** Copia del estado tal como estaba antes de migrar al modelo de una sola lista. */
  backupBeforeV5?: unknown
}

const store = new Store<Schema>({
  name: 'modo-productividad',
  defaults: { state: INITIAL_STATE }
})

// Migración al arrancar: estados viejos (listas separadas de Hoy / programadas /
// proyectos) pasan al modelo de una sola lista con etiquetas. Antes de tocar nada
// se guarda una copia del estado original por si hiciera falta recuperarlo.
{
  const raw = store.get('state') as unknown as { version?: number } | undefined
  if (raw && (raw.version ?? 0) < STATE_VERSION) {
    if (store.get('backupBeforeV5') === undefined) store.set('backupBeforeV5', raw)
    store.set('state', normalizeState(raw as Partial<PersistedState>))
  }
}

export function getState(): PersistedState {
  return store.get('state')
}

export function setState(next: PersistedState): void {
  store.set('state', next)
}

/** Empuja un estado a todas las ventanas (main + mini) sin volver a guardarlo. */
export function broadcastState(next: PersistedState): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('store:changed', next)
  }
}

export function patchSettings(patch: Partial<AppSettings>): PersistedState {
  const current = getState()
  const next = { ...current, settings: { ...current.settings, ...patch } }
  setState(next)
  return next
}

/**
 * Registra la persistencia. `onSettingsChange` se dispara cuando el renderer
 * guarda un estado con settings distintos (para re-aplicar login item, atajo, etc.).
 */
export function registerStoreIpc(
  onSettingsChange: (s: AppSettings) => void,
  onStateSaved: (s: PersistedState) => void = () => {}
): void {
  ipcMain.handle('store:load', (): PersistedState => getState())

  ipcMain.handle('store:save', (event, next: PersistedState): void => {
    const prev = getState()
    setState(next)

    // sincroniza las demás ventanas (main <-> mini)
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.webContents.id !== event.sender.id) {
        win.webContents.send('store:changed', next)
      }
    }

    if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
      onSettingsChange(next.settings)
    }
    onStateSaved(next)
  })
}

export { store }
