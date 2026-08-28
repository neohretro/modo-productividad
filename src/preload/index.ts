import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { PersistedState } from '../shared/types'
import type { UpdateStatus } from '../shared/update'
import type { AuthResult, AuthState } from '../shared/auth'
import type { SyncStatus } from '../shared/sync'

/** API expuesta al renderer. */
const api = {
  // ventana sin marco
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  enterMiniMode: () => ipcRenderer.send('window:enterMini'),
  exitMiniMode: () => ipcRenderer.send('window:exitMini'),
  notifyMultitask: (count: number) => ipcRenderer.send('notify:multitask', count),
  setResolvedTheme: (theme: 'light' | 'dark') => ipcRenderer.send('theme:set', theme),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  // persistencia
  loadState: (): Promise<PersistedState> => ipcRenderer.invoke('store:load'),
  saveState: (state: PersistedState): Promise<void> =>
    ipcRenderer.invoke('store:save', state),

  /** Notifica cuando OTRA ventana guardó cambios (sync main <-> mini). */
  onStateChanged: (cb: (state: PersistedState) => void): (() => void) => {
    const listener = (_e: unknown, state: PersistedState): void => cb(state)
    ipcRenderer.on('store:changed', listener)
    return () => ipcRenderer.removeListener('store:changed', listener)
  },

  // actualizaciones
  updater: {
    getStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('updater:status'),
    check: () => ipcRenderer.send('updater:check'),
    download: () => ipcRenderer.send('updater:download'),
    install: () => ipcRenderer.send('updater:install'),
    onStatus: (cb: (s: UpdateStatus) => void): (() => void) => {
      const listener = (_e: unknown, s: UpdateStatus): void => cb(s)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    }
  },

  // cuenta / sincronización (opcional)
  auth: {
    getState: (): Promise<AuthState> => ipcRenderer.invoke('auth:state'),
    requestCode: (email: string): Promise<AuthResult> =>
      ipcRenderer.invoke('auth:requestCode', email),
    verifyCode: (email: string, code: string, consent: boolean): Promise<AuthResult> =>
      ipcRenderer.invoke('auth:verifyCode', email, code, consent),
    signOut: (): Promise<void> => ipcRenderer.invoke('auth:signOut'),
    onChange: (cb: (s: AuthState) => void): (() => void) => {
      const listener = (_e: unknown, s: AuthState): void => cb(s)
      ipcRenderer.on('auth:changed', listener)
      return () => ipcRenderer.removeListener('auth:changed', listener)
    }
  },

  sync: {
    getStatus: (): Promise<SyncStatus> => ipcRenderer.invoke('sync:status'),
    now: (): Promise<void> => ipcRenderer.invoke('sync:now'),
    onStatus: (cb: (s: SyncStatus) => void): (() => void) => {
      const listener = (_e: unknown, s: SyncStatus): void => cb(s)
      ipcRenderer.on('sync:status', listener)
      return () => ipcRenderer.removeListener('sync:status', listener)
    }
  }
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
