import { BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import { INITIAL_STATE, type AppSettings, type PersistedState } from '../shared/types'

interface Schema {
  state: PersistedState
}

const store = new Store<Schema>({
  name: 'modo-productividad',
  defaults: { state: INITIAL_STATE }
})

export function getState(): PersistedState {
  return store.get('state')
}

export function setState(next: PersistedState): void {
  store.set('state', next)
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
export function registerStoreIpc(onSettingsChange: (s: AppSettings) => void): void {
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
  })
}

export { store }
