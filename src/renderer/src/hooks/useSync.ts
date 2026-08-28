import { useEffect, useState } from 'react'
import type { SyncStatus } from '@shared/sync'

const INITIAL: SyncStatus = { phase: 'off', lastSyncedAt: null }

/** Estado de la sincronización en la nube (viene del proceso main). */
export function useSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(INITIAL)

  useEffect(() => {
    window.modo?.sync.getStatus().then(setStatus).catch(() => undefined)
    return window.modo?.sync.onStatus(setStatus)
  }, [])

  return status
}
