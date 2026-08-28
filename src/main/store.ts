import { ipcMain } from 'electron'
import Store from 'electron-store'
import { INITIAL_STATE, type PersistedState } from '../shared/types'

interface Schema {
  state: PersistedState
}

const store = new Store<Schema>({
  name: 'modo-productividad',
  defaults: { state: INITIAL_STATE }
})

/** Registra los canales IPC de persistencia. Llamar una vez en `app.whenReady`. */
export function registerStoreIpc(): void {
  ipcMain.handle('store:load', (): PersistedState => store.get('state'))
  ipcMain.handle('store:save', (_e, next: PersistedState): void => {
    store.set('state', next)
  })
}

export { store }
