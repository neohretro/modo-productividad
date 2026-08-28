import { join } from 'path'
import { BrowserWindow, screen, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { getState, patchSettings } from './store'

const PRELOAD = join(__dirname, '../preload/index.mjs')
const RENDERER_DIR = join(__dirname, '../renderer')

let mainWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null
/** El mini es la ventana principal; la completa se abre bajo demanda. */
let activeKind: 'main' | 'mini' = 'mini'
/** Color de fondo de la ventana completa según el tema (evita bordes raros). */
let bgColor = '#100f0e'

const MINI_SIZE = { width: 296, height: 444 }

/** El renderer avisa el tema resuelto; pintamos el fondo de la ventana completa igual.
 * El mini es transparente (vidrio real), no se le toca el fondo. */
export function setWindowsBackground(theme: 'light' | 'dark'): void {
  bgColor = theme === 'dark' ? '#100f0e' : '#e9e7e0'
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setBackgroundColor(bgColor)
}

function loadRoute(win: BrowserWindow, route: 'index' | 'mini'): void {
  const file = route === 'index' ? 'index.html' : 'mini.html'
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${file}`)
  } else {
    win.loadFile(join(RENDERER_DIR, file))
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/** Arranque: el mini es lo primero que ve el usuario. */
export function startApp(): void {
  createMiniWindow({ show: true })
}

export function createMainWindow(opts: { show?: boolean } = {}): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
  const autoShow = opts.show ?? true

  mainWindow = new BrowserWindow({
    width: 1060,
    height: 800,
    minWidth: 940,
    minHeight: 700,
    show: false,
    frame: false,
    backgroundColor: bgColor,
    roundedCorners: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: { preload: PRELOAD, sandbox: false }
  })

  mainWindow.on('ready-to-show', () => {
    if (autoShow) mainWindow?.show()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  loadRoute(mainWindow, 'index')
  return mainWindow
}

export function createMiniWindow(opts: { show?: boolean } = {}): BrowserWindow {
  if (miniWindow && !miniWindow.isDestroyed()) return miniWindow
  const autoShow = opts.show ?? true

  const saved = getState().settings.miniWindowBounds
  const fallback = defaultMiniPosition()

  miniWindow = new BrowserWindow({
    ...MINI_SIZE,
    x: saved?.x ?? fallback.x,
    y: saved?.y ?? fallback.y,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: { preload: PRELOAD, sandbox: false, backgroundThrottling: false }
  })

  miniWindow.setAlwaysOnTop(true, 'floating')
  miniWindow.on('ready-to-show', () => {
    if (autoShow) miniWindow?.show()
  })
  miniWindow.on('closed', () => {
    miniWindow = null
  })

  const persistBounds = debounce(() => {
    if (!miniWindow || miniWindow.isDestroyed()) return
    const [x, y] = miniWindow.getPosition()
    patchSettings({ miniWindowBounds: { x, y } })
  }, 400)
  miniWindow.on('move', persistBounds)

  loadRoute(miniWindow, 'mini')
  return miniWindow
}

/** Pasar a modo mini: oculta la principal, muestra la burbuja. */
export function enterMiniMode(): void {
  createMiniWindow()
  miniWindow?.show()
  mainWindow?.hide()
  activeKind = 'mini'
}

/** Volver a la ventana completa desde el modo mini. */
export function exitMiniMode(): void {
  const win = createMainWindow()
  win.show()
  win.focus()
  miniWindow?.hide()
  activeKind = 'main'
}

function activeWindow(): BrowserWindow {
  if (activeKind === 'mini' && miniWindow && !miniWindow.isDestroyed()) return miniWindow
  return mainWindow ?? createMainWindow()
}

/** Atajo global / clic en tray: alterna visibilidad de la ventana activa. */
export function toggleVisibility(): void {
  const win = activeWindow()
  if (win.isVisible() && !win.isMinimized()) {
    win.hide()
  } else {
    win.show()
    win.focus()
  }
}

export function showActiveWindow(): void {
  const win = activeWindow()
  win.show()
  win.focus()
}

function defaultMiniPosition(): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x + workArea.width - MINI_SIZE.width - 24,
    y: workArea.y + workArea.height - MINI_SIZE.height - 24
  }
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined
  return ((...args: never[]) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }) as T
}
