import { app, BrowserWindow, shell } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../shared/update'

const { autoUpdater } = electronUpdater

let status: UpdateStatus = { state: 'idle' }

const RELEASES_API = 'https://api.github.com/repos/neohretro/modo-productividad/releases/latest'
const RELEASES_PAGE = 'https://github.com/neohretro/modo-productividad/releases/latest'

/**
 * En macOS la auto-actualización exige una app firmada con certificado de Apple.
 * Mientras no la tengamos, la app solo AVISA que hay versión nueva y abre la página
 * de descargas; la instalación es manual. En Windows todo es automático.
 */
const MANUAL_UPDATES = process.platform === 'darwin'

function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}

async function checkManually(): Promise<void> {
  broadcast({ state: 'checking' })
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}`)
    const latest = String(((await res.json()) as { tag_name?: string }).tag_name ?? '').replace(/^v/, '')
    broadcast(
      latest && isNewer(latest, app.getVersion())
        ? { state: 'available', version: latest }
        : { state: 'none' }
    )
  } catch (err) {
    broadcast({ state: 'error', message: (err as Error)?.message ?? 'Error al comprobar' })
  }
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

function broadcast(next: UpdateStatus): void {
  status = next
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('updater:status', next)
  }
}

/** Configura electron-updater. No hace nada en desarrollo (no hay release feed). */
export function initUpdater(): void {
  if (!app.isPackaged) return

  if (MANUAL_UPDATES) {
    setTimeout(() => void checkManually(), 8_000)
    setInterval(() => void checkManually(), 3 * 60 * 60 * 1000)
    return
  }

  autoUpdater.autoDownload = false // pedimos permiso antes de bajar
  autoUpdater.autoInstallOnAppQuit = true
  // silencioso: los errores de red/404 ya se manejan y no deben ensuciar la consola
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    broadcast({ state: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => broadcast({ state: 'none' }))
  autoUpdater.on('download-progress', (p) => {
    const v =
      status.state === 'downloading' || status.state === 'available'
        ? (status as { version: string }).version
        : ''
    broadcast({ state: 'downloading', version: v, percent: Math.round(p.percent) })
  })
  autoUpdater.on('update-downloaded', (info) =>
    broadcast({ state: 'ready', version: info.version })
  )
  autoUpdater.on('error', (err) =>
    broadcast({ state: 'error', message: err?.message ?? 'Error al actualizar' })
  )

  // primera comprobación a los 8s, luego cada 3h
  setTimeout(() => void checkForUpdates(), 8_000)
  setInterval(() => void checkForUpdates(), 3 * 60 * 60 * 1000)
}

export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) return
  if (MANUAL_UPDATES) return checkManually()
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    broadcast({ state: 'error', message: (err as Error)?.message ?? 'Error al comprobar' })
  }
}

export async function downloadUpdate(): Promise<void> {
  if (!app.isPackaged) return
  if (MANUAL_UPDATES) {
    void shell.openExternal(RELEASES_PAGE)
    return
  }
  try {
    await autoUpdater.downloadUpdate()
  } catch (err) {
    broadcast({ state: 'error', message: (err as Error)?.message ?? 'Error al descargar' })
  }
}

/**
 * Cierra la app e instala. Solo si el estado es 'ready'.
 *
 * `isSilent = true`: el instalador NSIS corre en modo silencioso, que cierra la
 * instancia en ejecución por su cuenta en vez de mostrar el diálogo
 * "No se puede cerrar la aplicación... Reintentar". `isForceRunAfter = true`:
 * relanza la app al terminar. Antes de lanzarlo, destruimos las ventanas para
 * que no queden procesos de render bloqueando archivos.
 */
export function quitAndInstall(): void {
  if (status.state !== 'ready') return
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.destroy()
  }
  autoUpdater.quitAndInstall(true, true)
}
