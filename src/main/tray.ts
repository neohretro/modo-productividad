import { app, Menu, nativeImage, Tray } from 'electron'
import { getState, patchSettings } from './store'
import { enterMiniMode, exitMiniMode, showActiveWindow } from './windows'
import { applyLoginItem } from './system'

// Isotipo MODO (tarjeta negra + ventana blanca + esquina activa naranja), 32px,
// embebido para evitar problemas de ruta entre dev y el paquete asar.
// Generado por scripts/gen-icons.mjs — mantener en sync con build/tray.png.
const TRAY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAArklEQVR42u2WMQrCMBSGgy7/IYpLLubulCWLVyhCrhHIIVzEe+QgTx6oaNBC09Q4/B98W/v6dXgkxhCyMjIa+eBFRjP0DFBz7wDV9Q6Ibw8DGACcAMRWzg3IAKSlcwOEAa9aa8V7LymlKvXd63Enab99ej5ssn74rpsMCCHIUnRGMTd+XZkyQP9iKTqDAQyoDtA1rF3BhzqjOmAl/zsg/yDATQU0P44LHS+phJCSG3jzqZgbHLZMAAAAAElFTkSuQmCC'

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
