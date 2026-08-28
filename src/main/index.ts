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
import { applyGlobalShortcut, applyLoginItem, unregisterAllShortcuts } from './system'
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

    registerStoreIpc(onSettingsChange)

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

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMiniWindow({ show: true })
    })
  })

  // No salir al cerrar ventanas: la app vive en la bandeja.
  app.on('window-all-closed', () => {
    // en macOS es lo normal; en Windows mantenemos el proceso vivo por el tray
  })

  app.on('will-quit', () => unregisterAllShortcuts())
}

function onSettingsChange(next: AppSettings): void {
  applyLoginItem(next.launchOnStartup)
  applyGlobalShortcut(next.globalShortcut)
  refreshTrayMenu()
}
