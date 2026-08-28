/**
 * Cliente de Supabase para el proceso main. El renderer nunca lo toca directo:
 * habla por IPC (`auth:*`). Así los tokens viven solo en main y, si el SO lo
 * permite, cifrados en disco (safeStorage).
 *
 * Config: `MAIN_VITE_SUPABASE_URL` + `MAIN_VITE_SUPABASE_ANON_KEY` (públicas, las
 * mismas que Planner expone en el navegador). Se toman de `.env` en build. Si
 * faltan, la app corre igual pero sin opción de iniciar sesión.
 */
import { EventEmitter } from 'node:events'
import { BrowserWindow, ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuthResult, AuthState, AuthUser } from '../shared/auth'

const URL = import.meta.env.MAIN_VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(URL && ANON_KEY)

// --- almacén de sesión (cifrado si se puede) --------------------------------
const sessionStore = new Store<{ v: Record<string, string> }>({
  name: 'modo-auth',
  defaults: { v: {} },
  // el contenido ya va cifrado por valor; esto es defensa en profundidad
  encryptionKey: 'modo-creador-productividad'
})

const canEncrypt = (): boolean => {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

const authStorage = {
  getItem(key: string): string | null {
    const raw = sessionStore.get('v')[key]
    if (raw == null) return null
    if (!raw.startsWith('enc:')) return raw
    try {
      return safeStorage.decryptString(Buffer.from(raw.slice(4), 'base64'))
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    const stored = canEncrypt()
      ? 'enc:' + safeStorage.encryptString(value).toString('base64')
      : value
    const v = { ...sessionStore.get('v'), [key]: stored }
    sessionStore.set('v', v)
  },
  removeItem(key: string): void {
    const v = { ...sessionStore.get('v') }
    delete v[key]
    sessionStore.set('v', v)
  }
}

// --- cliente ----------------------------------------------------------------
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(URL as string, ANON_KEY as string, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    })
  }
  return client
}

// --- estado de sesión + eventos -------------------------------------------
const bus = new EventEmitter()
let current: AuthState = {
  user: null,
  loading: isSupabaseConfigured,
  configured: isSupabaseConfigured
}

function userFrom(session: { user?: { id: string; email?: string | null } } | null): AuthUser | null {
  if (!session?.user?.email) return null
  return { id: session.user.id, email: session.user.email }
}

function setState(next: Partial<AuthState>): void {
  current = { ...current, ...next }
  bus.emit('change', current)
}

export function getAuthState(): AuthState {
  return current
}

export function onAuthStateChange(cb: (s: AuthState) => void): () => void {
  bus.on('change', cb)
  return () => bus.off('change', cb)
}

/** Resuelve la sesión guardada y engancha los cambios. Llamar una vez al arrancar. */
export async function initAuth(): Promise<void> {
  const sb = getSupabase()
  if (!sb) {
    setState({ loading: false })
    return
  }
  const { data } = await sb.auth.getSession()
  setState({ user: userFrom(data.session), loading: false })

  sb.auth.onAuthStateChange((_event, session) => {
    const wasSignedIn = current.user !== null
    setState({ user: userFrom(session), loading: false })
    if (!wasSignedIn && current.user) void upsertProfile()
  })
}

// --- acciones (las llama el IPC `auth:*`) ---------------------------------

/** Pide a Supabase que envíe un código de un solo uso al correo. */
export async function requestCode(email: string): Promise<AuthResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'La sincronización no está disponible en esta versión.' }
  const clean = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { ok: false, error: 'Escribe un correo válido.' }
  }
  const { error } = await sb.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true }
  })
  if (error) return { ok: false, error: friendly(error.message) }
  return { ok: true }
}

/** Verifica el código y abre la sesión. Guarda el consentimiento de marketing. */
export async function verifyCode(
  email: string,
  code: string,
  marketingConsent: boolean
): Promise<AuthResult> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'La sincronización no está disponible en esta versión.' }
  const { data, error } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email'
  })
  if (error) return { ok: false, error: friendly(error.message) }

  pendingConsent = marketingConsent
  if (data.session) {
    setState({ user: userFrom(data.session), loading: false })
    void upsertProfile()
  }
  return { ok: true }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.auth.signOut()
  setState({ user: null, loading: false })
}

// El consentimiento se captura en verifyCode y se escribe cuando ya hay sesión.
let pendingConsent: boolean | null = null

/**
 * Crea o actualiza `productividad.profiles` con el consentimiento. Tolera que la
 * migración 0027 todavía no esté aplicada (no rompe el login).
 */
async function upsertProfile(): Promise<void> {
  const sb = getSupabase()
  if (!sb || !current.user) return
  const row: Record<string, unknown> = { user_id: current.user.id }
  if (pendingConsent !== null) {
    row.marketing_consent = pendingConsent
    row.marketing_consent_source = 'productividad_signup'
    row.marketing_consent_at = pendingConsent ? new Date().toISOString() : null
  }
  try {
    const { error } = await sb
      .schema('productividad')
      .from('profiles')
      .upsert(row, { onConflict: 'user_id' })
    if (error) console.warn('[auth] no se pudo guardar el perfil:', error.message)
    else pendingConsent = null
  } catch (e) {
    console.warn('[auth] perfil:', (e as Error).message)
  }
}

function friendly(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('token has expired') || m.includes('invalid')) {
    return 'El código no es válido o ya venció. Pide uno nuevo.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Sin conexión. Revisa tu internet.'
  }
  return msg
}

// --- IPC ------------------------------------------------------------------
export function registerAuthIpc(): void {
  ipcMain.handle('auth:state', () => getAuthState())
  ipcMain.handle('auth:requestCode', (_e, email: string) => requestCode(email))
  ipcMain.handle('auth:verifyCode', (_e, email: string, code: string, consent: boolean) =>
    verifyCode(email, code, consent)
  )
  ipcMain.handle('auth:signOut', () => signOut())

  onAuthStateChange((state) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('auth:changed', state)
    }
  })
}
