/**
 * Autenticación opcional (Supabase). La app funciona sin cuenta; iniciar sesión
 * solo habilita la sincronización en la nube. Login por código de un solo uso
 * (OTP) enviado al correo: nada de contraseñas ni deep-links.
 */

export interface AuthUser {
  id: string
  email: string
}

export interface AuthState {
  /** null = sin sesión (modo local). */
  user: AuthUser | null
  /** true mientras el proceso main aún no resolvió la sesión guardada. */
  loading: boolean
  /** Supabase está configurado en este build (hay URL + anon key). */
  configured: boolean
}

export interface AuthResult {
  ok: boolean
  /** mensaje legible si `ok` es false. */
  error?: string
}
