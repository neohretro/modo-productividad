/**
 * Motor de sincronización en la nube (proceso main).
 *
 *  - Al iniciar sesión: baja el estado remoto (o sube el local si es la 1ª vez).
 *  - Al guardar algo local: lo sube (con debounce).
 *  - Cada minuto: baja, por si otro equipo cambió algo.
 *  - Conflicto (dos equipos escribieron): fusiona y reintenta una vez.
 *
 * El estado vive como un blob JSONB por usuario en `productividad.sync_state`.
 * Ver la lógica de fusión pura en `src/shared/sync.ts`.
 */
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import { normalizeState } from '../shared/focus'
import { isPristine, mergeStates, stateFingerprint, type SyncStatus } from '../shared/sync'
import type { PersistedState } from '../shared/types'
import { getSupabase, getAuthState } from './supabase'
import { broadcastState, getState, setState } from './store'

const TABLE = 'sync_state'
const SCHEMA = 'productividad'
const PUSH_DEBOUNCE_MS = 2_000
const PULL_INTERVAL_MS = 60_000

interface SyncMeta {
  /** a qué cuenta pertenecen `lastPulledRev` / `lastSyncedFingerprint`. */
  userId: string
  lastPulledRev: number
  lastSyncedFingerprint: string
  deviceId: string
}

const meta = new Store<SyncMeta>({
  name: 'modo-sync',
  defaults: { userId: '', lastPulledRev: 0, lastSyncedFingerprint: '', deviceId: '' }
})

/** ¿El progreso de sync guardado es de otra cuenta (o no hay)? */
function isFreshIdentity(userId: string): boolean {
  return meta.get('userId') !== userId
}

function resetMetaFor(userId: string): void {
  meta.set('userId', userId)
  meta.set('lastPulledRev', 0)
  meta.set('lastSyncedFingerprint', '')
}

function deviceId(): string {
  let id = meta.get('deviceId')
  if (!id) {
    id = randomUUID()
    meta.set('deviceId', id)
  }
  return id
}

const deviceLabel = (): string => {
  try {
    return os.hostname() || 'este equipo'
  } catch {
    return 'este equipo'
  }
}

// --- estado observable ------------------------------------------------------
const bus = new EventEmitter()
let status: SyncStatus = { phase: 'off', lastSyncedAt: null }

function setStatus(next: Partial<SyncStatus>): void {
  status = { ...status, ...next }
  if (import.meta.env.DEV) console.log('[sync]', status.phase, status.message ?? '')
  bus.emit('change', status)
}

export function getSyncStatus(): SyncStatus {
  return status
}

export function onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
  bus.on('change', cb)
  return () => bus.off('change', cb)
}

// --- ciclo de vida ---------------------------------------------------------
let activeUserId: string | null = null
let freshStart = false
let pushTimer: ReturnType<typeof setTimeout> | undefined
let pullTimer: ReturnType<typeof setInterval> | undefined
let running = false
let dirtyWhileRunning = false

export function startSync(): void {
  const user = getAuthState().user
  if (!user || !getSupabase()) return
  if (activeUserId === user.id) return // ya sincronizando a esta cuenta

  // Cambió la cuenta (o es la primera vez): el progreso de sync anterior no aplica.
  freshStart = isFreshIdentity(user.id)
  if (freshStart) resetMetaFor(user.id)

  activeUserId = user.id
  setStatus({ phase: 'idle' })
  void cycle('sync')

  clearInterval(pullTimer)
  pullTimer = setInterval(() => void cycle('sync', true), PULL_INTERVAL_MS)
}

export function stopSync(): void {
  activeUserId = null
  clearTimeout(pushTimer)
  clearInterval(pullTimer)
  pushTimer = undefined
  pullTimer = undefined
  setStatus({ phase: 'off', message: undefined })
}

/** Lo llama el store cuando el estado local se guardó. */
export function notifyLocalChange(): void {
  if (!activeUserId) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void cycle('push'), PUSH_DEBOUNCE_MS)
}

// --- núcleo --------------------------------------------------------------
async function cycle(kind: 'pull' | 'push' | 'sync', silent = false): Promise<void> {
  if (!activeUserId) return
  if (running) {
    dirtyWhileRunning = true
    return
  }
  running = true
  // El chequeo periódico no debe parpadear "Sincronizando…" en la UI cada minuto.
  if (!silent) setStatus({ phase: 'syncing' })
  try {
    if (kind === 'pull') await pull()
    else if (kind === 'push') await push()
    else {
      await pull()
      await push() // sube cambios locales que quedaron pendientes (p. ej. tras un corte)
    }
    setStatus({ phase: 'synced', lastSyncedAt: Date.now(), message: undefined })
  } catch (e) {
    if (import.meta.env.DEV) console.error('[sync] error', e)
    setStatus({ phase: 'error', message: friendly((e as Error).message) })
  } finally {
    running = false
    if (dirtyWhileRunning) {
      dirtyWhileRunning = false
      notifyLocalChange()
    }
  }
}

function table() {
  const sb = getSupabase()
  if (!sb) throw new Error('sin conexión')
  return sb.schema(SCHEMA).from(TABLE)
}

async function pull(): Promise<void> {
  const uid = activeUserId as string
  const { data, error } = await table()
    .select('state, state_version, rev')
    .eq('user_id', uid)
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (!data) {
    // No hay nada en la nube: sube lo local (flujo "usé la app offline y ahora entro").
    await insertInitial()
    freshStart = false
    return
  }

  const remoteRev = Number(data.rev)
  const remote = normalizeState(data.state as Partial<PersistedState>)

  // Primera vez en este equipo con esta cuenta: la nube manda.
  if (freshStart) {
    freshStart = false
    if (isPristine(getState())) {
      applyRemote(remote, remoteRev) // equipo limpio → copia la nube tal cual
    } else {
      const merged = mergeStates(getState(), remote) // había trabajo offline → conserva ambos
      applyRemote(merged, remoteRev)
      await push()
    }
    return
  }

  if (remoteRev === meta.get('lastPulledRev')) return // nada nuevo remoto

  const localDirty = stateFingerprint(getState()) !== meta.get('lastSyncedFingerprint')
  if (!localDirty) {
    applyRemote(remote, remoteRev)
    return
  }

  // Dos equipos cambiaron entre sincronizaciones: fusiona y vuelve a subir.
  const merged = mergeStates(getState(), remote)
  applyRemote(merged, remoteRev)
  await push()
}

async function push(): Promise<void> {
  const uid = activeUserId as string
  const local = getState()
  const fp = stateFingerprint(local)
  if (fp === meta.get('lastSyncedFingerprint')) return // nada que subir

  const { data, error } = await table()
    .update({
      state: local,
      state_version: local.version,
      last_device_id: deviceId(),
      last_device_label: deviceLabel()
    })
    .eq('user_id', uid)
    .eq('rev', meta.get('lastPulledRev'))
    .select('rev')
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (!data) {
    // rev cambió bajo nuestros pies → alguien más subió primero. Baja y fusiona.
    await pull()
    return
  }

  meta.set('lastPulledRev', Number(data.rev))
  meta.set('lastSyncedFingerprint', fp)
}

async function insertInitial(): Promise<void> {
  const uid = activeUserId as string
  const local = getState()
  const { data, error } = await table()
    .insert({
      user_id: uid,
      state: local,
      state_version: local.version,
      last_device_id: deviceId(),
      last_device_label: deviceLabel()
    })
    .select('rev')
    .single()
  if (error) {
    // carrera: otro cliente insertó primero → baja
    if (error.code === '23505') {
      meta.set('lastPulledRev', 0)
      await pull()
      return
    }
    throw new Error(error.message)
  }
  meta.set('lastPulledRev', Number(data.rev))
  meta.set('lastSyncedFingerprint', stateFingerprint(local))
}

function applyRemote(next: PersistedState, rev: number): void {
  setState(next)
  broadcastState(next)
  meta.set('lastPulledRev', rev)
  meta.set('lastSyncedFingerprint', stateFingerprint(next))
}

function friendly(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('schema') && m.includes('must be one of')) {
    return 'Falta exponer el esquema "productividad" en Supabase (Settings > API).'
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('sin conexión')) {
    return 'Sin conexión. Se reintenta solo.'
  }
  return msg
}

// --- IPC -----------------------------------------------------------------
export function registerSyncIpc(): void {
  ipcMain.handle('sync:status', () => getSyncStatus())
  ipcMain.handle('sync:now', () => cycle('sync'))

  onSyncStatusChange((s) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('sync:status', s)
    }
  })
}
