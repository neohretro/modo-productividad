import { useEffect, useState } from 'react'
import type { AuthState } from '@shared/auth'

const INITIAL: AuthState = { user: null, loading: true, configured: false }

/** Estado de la cuenta (viene del proceso main). Login opcional. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(INITIAL)

  useEffect(() => {
    window.modo?.auth
      .getState()
      .then(setState)
      .catch(() => setState({ user: null, loading: false, configured: false }))
    return window.modo?.auth.onChange(setState)
  }, [])

  return state
}
