import { useCallback } from 'react'

/** Lo que NO arrastra la ventana: controles, campos de texto y todo lo marcado con data-no-move. */
const INTERACTIVE =
  'button, a, input, textarea, select, label, [role="button"], [contenteditable="true"], [data-no-move]'

/** Píxeles que hay que mover el mouse antes de que cuente como arrastre (y no como clic). */
const THRESHOLD = 4

/**
 * Mover la ventana mini agarrándola de CUALQUIER parte que no sea un control (huecos entre
 * tareas, el texto de una tarea, los bordes, el anillo...), no solo del encabezado.
 *
 * Se hace por código y no con `-webkit-app-region: drag` en toda la ventana porque esas zonas
 * le quitan al contenido la rueda del mouse y el trackpad: con la lista marcada como arrastre,
 * el scroll "a veces no respondía". Aquí la lista queda libre y solo se mueve la ventana
 * cuando de verdad se arrastra.
 */
export function useDragAnywhere(): { onMouseDown: (e: React.MouseEvent) => void } {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest(INTERACTIVE)) return
    // clic sobre la barra de desplazamiento: es para desplazar, no para mover
    if (target.scrollHeight > target.clientHeight && e.nativeEvent.offsetX >= target.clientWidth) return

    const startX = e.screenX
    const startY = e.screenY
    let moving = false
    let frame = 0
    let dx = 0
    let dy = 0

    const flush = (): void => {
      frame = 0
      window.modo?.miniDragMove(dx, dy)
    }
    const onMove = (ev: MouseEvent): void => {
      dx = ev.screenX - startX
      dy = ev.screenY - startY
      if (!moving) {
        if (Math.hypot(dx, dy) < THRESHOLD) return
        moving = true
        window.modo?.miniDragStart()
        document.body.style.cursor = 'grabbing'
      }
      if (!frame) frame = requestAnimationFrame(flush)
    }
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (frame) cancelAnimationFrame(frame)
      if (moving) {
        window.modo?.miniDragMove(dx, dy)
        document.body.style.cursor = ''
        // el clic que sigue a soltar no debe activar nada (p. ej. editar una tarea)
        const swallow = (ev: Event): void => ev.stopPropagation()
        window.addEventListener('click', swallow, { capture: true, once: true })
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return { onMouseDown }
}
