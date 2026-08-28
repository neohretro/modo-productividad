import { app, Menu, nativeImage, Tray } from 'electron'
import { getState, patchSettings } from './store'
import { enterMiniMode, exitMiniMode, showActiveWindow } from './windows'
import { applyLoginItem } from './system'

// Isotipo MODO (cuadrado negro + esquina activa naranja), 32px, embebido para
// evitar problemas de ruta entre dev y el paquete asar.
const TRAY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAZElEQVR42u3XMQrAQAhEUTsvnztvSBEIsptoWLX5H6Z/7YgQmVR1eDcOCW8r4A9iOyCKSAFEEGkALyIV4EGkA74QJYA3RBlghSgFzBDlAItoATwRbYAb0Qq4BgAAAAAAOD5kOwF0NfIR3xk0XgAAAABJRU5ErkJggg=='

let tray: Tray | null = null

export function createTray(): Tray {
  const icon = nativeImage.createFromDataURL(TRAY_PNG).resize({ width: 16, height: 16 })
  icon.setTemplateImage(process.platform === 'darwin')

  tray = new Tray(icon)
  tray.setToolTip('MODO CREADOR - Productividad')
  tray.on('click', () => showActiveWindow())
  refreshTrayMenu()
  return tray
}

export function refreshTrayMenu(): void {
  if (!tray) return
  const { launchOnStartup } = getState().settings

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Mostrar', click: () => showActiveWindow() },
      { type: 'separator' },
      { label: 'Ventana completa', click: () => exitMiniMode() },
      { label: 'Modo mini', click: () => enterMiniMode() },
      { type: 'separator' },
      {
        label: 'Iniciar con Windows',
        type: 'checkbox',
        checked: launchOnStartup,
        click: (item) => {
          patchSettings({ launchOnStartup: item.checked })
          applyLoginItem(item.checked)
          refreshTrayMenu()
        }
      },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() }
    ])
  )
}
