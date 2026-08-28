import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/update'

/** Sigue el estado del actualizador automático (viene del proceso main). */
export function useUpdate(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => {
    window.modo?.updater.getStatus().then(setStatus).catch(() => undefined)
    return window.modo?.updater.onStatus(setStatus)
  }, [])

  return status
}
