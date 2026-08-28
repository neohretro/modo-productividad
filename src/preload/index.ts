import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { PersistedState } from '../shared/types'

/** API expuesta al renderer. */
const api = {
  // ventana sin marco
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  // persistencia
  loadState: (): Promise<PersistedState> => ipcRenderer.invoke('store:load'),
  saveState: (state: PersistedState): Promise<void> =>
    ipcRenderer.invoke('store:save', state)
}

export type ModoApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('modo', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (sin aislamiento de contexto)
  window.electron = electronAPI
  // @ts-ignore
  window.modo = api
}
