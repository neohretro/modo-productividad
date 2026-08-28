import { useEffect, useState } from 'react'

/**
 * Reloj que avanza cada `intervalMs` mientras `running` sea true.
 * Para mostrar cronómetros de enfoque en vivo.
 */
export function useNow(running: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [running, intervalMs])

  return now
}
