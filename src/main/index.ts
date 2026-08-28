import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { getState, registerStoreIpc } from './store'
import {
  createMainWindow,
  enterMiniMode,
  exitMiniMode,
  getMainWindow,
  toggleVisibility
} from './windows'
import { createTray, refreshTrayMenu } from './tray'
import {
  applyGlobalShortcut,
  applyLoginItem,
  startedHidden,
  unregisterAllShortcuts
} from './system'
import type { AppSettings } from '../shared/types'

// Instancia única: si ya hay una corriendo, enfocarla y salir.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => toggleVisibility())

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.modocreador.productividad')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // --- IPC ---
    ipcMain.on('window:minimize', () => getMainWindow()?.minimize())
    ipcMain.on('window:close', () => getMainWindow()?.hide()) // cerrar = a la bandeja
    ipcMain.on('window:enterMini', () => enterMiniMode())
    ipcMain.on('window:exitMini', () => exitMiniMode())
    ipcMain.handle('app:getVersion', () => app.getVersion())

    registerStoreIpc(onSettingsChange)

    // --- estado nativo inicial desde settings persistidas ---
    const { settings } = getState()
    applyLoginItem(settings.launchOnStartup)
    applyGlobalShortcut(settings.globalShortcut)

    createMainWindow({ show: !startedHidden() })
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
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
