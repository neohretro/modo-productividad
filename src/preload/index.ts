import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/** API mínima expuesta al renderer para Fase 0 (controles de ventana). */
const api = {
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
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
