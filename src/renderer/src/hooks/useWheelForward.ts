import { useCallback, useRef } from 'react'

/**
 * Una tarjeta con encabezado + lista con scroll + campo de agregar solo desliza cuando el
 * cursor está SOBRE la lista. Con el trackpad es fácil quedarse un poco fuera y "no responde".
 * Este hook reenvía la rueda del resto de la tarjeta a la lista.
 *
 * Uso: `const { listRef, onWheel } = useWheelForward()` → `onWheel` en la tarjeta y `listRef` en
 * el contenedor con scroll.
 */
export function useWheelForward<T extends HTMLElement = HTMLDivElement>(): {
  listRef: React.RefObject<T | null>
  onWheel: (e: React.WheelEvent) => void
} {
  const listRef = useRef<T | null>(null)
  const onWheel = useCallback((e: React.WheelEvent) => {
    const list = listRef.current
    if (!list || list.contains(e.target as Node)) return
    if (list.scrollHeight <= list.clientHeight) return
    // un menú o campo con su propio scroll dentro de la tarjeta se queda con la rueda
    const unit = e.deltaMode === 1 ? 16 : 1 // 1 = líneas (ratón); 0 = píxeles (trackpad)
    list.scrollTop += e.deltaY * unit
  }, [])
  return { listRef, onWheel }
}
