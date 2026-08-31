import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { getState, registerStoreIpc } from './store'
import {
  createMiniWindow,
  enterMiniMode,
  exitMiniMode,
  getMainWindow,
  setWindowsBackground,
  showActiveWindow,
  startApp
} from './windows'
import { createTray, refreshTrayMenu } from './tray'
import { notifyMultitask } from './notifications'
import { clearReminders, syncReminders } from './reminders'
import { initAuth, onAuthStateChange, registerAuthIpc, shutdownSupabase } from './supabase'
import { notifyLocalChange, registerSyncIpc, startSync, stopSync } from './sync'
import { applyGlobalShortcut, applyLoginItem, unregisterAllShortcuts } from './system'
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateStatus,
  initUpdater,
  quitAndInstall
} from './updater'
import type { AppSettings } from '../shared/types'

// Instancia única: si ya hay una corriendo, enfocarla y salir.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showActiveWindow())

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.modocreador.productividad')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // --- IPC ---
    ipcMain.on('window:minimize', () => getMainWindow()?.minimize())
    ipcMain.on('window:close', () => enterMiniMode()) // cerrar la completa = volver al mini
    ipcMain.on('window:enterMini', () => enterMiniMode())
    ipcMain.on('window:exitMini', () => exitMiniMode())
    ipcMain.on('notify:multitask', (_e, count: number) => notifyMultitask(count))
    ipcMain.on('theme:set', (_e, t: 'light' | 'dark') => setWindowsBackground(t))
    ipcMain.handle('app:getVersion', () => app.getVersion())

    // --- actualizaciones ---
    ipcMain.handle('updater:status', () => getUpdateStatus())
    ipcMain.on('updater:check', () => void checkForUpdates())
    ipcMain.on('updater:download', () => void downloadUpdate())
    ipcMain.on('updater:install', () => quitAndInstall())

    registerStoreIpc(onSettingsChange, () => {
      syncReminders()
      notifyLocalChange()
    })
    registerAuthIpc()
    registerSyncIpc()

    // La sesión abierta arranca el sync; cerrarla lo detiene.
    onAuthStateChange((s) => (s.user ? startSync() : stopSync()))

    // --- estado nativo inicial desde settings persistidas ---
    const { settings } = getState()
    applyLoginItem(settings.launchOnStartup)
    applyGlobalShortcut(settings.globalShortcut)
    const resolvedTheme =
      settings.theme === 'system'
        ? nativeTheme.shouldUseDarkColors
          ? 'dark'
          : 'light'
        : settings.theme
    setWindowsBackground(resolvedTheme)

    startApp()
    createTray()
    initUpdater()
    syncReminders()
    void initAuth()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMiniWindow({ show: true })
    })
  })

  // No salir al cerrar ventanas: la app vive en la bandeja.
  app.on('window-all-closed', () => {
    // en macOS es lo normal; en Windows mantenemos el proceso vivo por el tray
  })

  // Al salir (incluida la instalación de una actualización): apaga los
  // temporizadores de fondo para que el proceso muera rápido y el instalador no
  // se tope con la app "todavía abierta".
  app.on('before-quit', () => {
    stopSync()
    clearReminders()
    shutdownSupabase()
  })

  app.on('will-quit', () => unregisterAllShortcuts())
}

function onSettingsChange(next: AppSettings): void {
  applyLoginItem(next.launchOnStartup)
  applyGlobalShortcut(next.globalShortcut)
  refreshTrayMenu()
}
