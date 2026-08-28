/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  /** URL pública del proyecto Supabase (misma que Planner). Opcional. */
  readonly MAIN_VITE_SUPABASE_URL?: string
  /** Llave anónima pública de Supabase. Opcional. */
  readonly MAIN_VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
