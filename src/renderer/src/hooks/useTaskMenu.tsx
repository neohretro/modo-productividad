import { useState } from 'react'
import type { Task } from '@shared/types'
import TaskContextMenu, { type MenuMode } from '../components/TaskContextMenu'
import type { MenuPos } from '../components/ContextMenu'

/**
 * Clic derecho sobre una tarea → menú contextual. Devuelve el handler para el
 * `onContextMenu` de la fila, el elemento del menú (o null) y `openTime`, que abre
 * el menú directo en "Tiempo dedicado" (para el botón del reloj de la fila).
 */
export function useTaskMenu(task: Task): {
  onContextMenu: (e: React.MouseEvent) => void
  openTime: (e: React.MouseEvent) => void
  menu: React.JSX.Element | null
} {
  const [open, setOpen] = useState<{ pos: MenuPos; mode: MenuMode } | null>(null)
  return {
    onContextMenu: (e) => {
      e.preventDefault()
      e.stopPropagation()
      setOpen({ pos: { x: e.clientX, y: e.clientY }, mode: 'root' })
    },
    openTime: (e) => {
      e.stopPropagation()
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setOpen({ pos: { x: Math.max(8, r.right - 220), y: r.bottom + 4 }, mode: 'time' })
    },
    menu: open ? (
      <TaskContextMenu
        task={task}
        pos={open.pos}
        initialMode={open.mode}
        onClose={() => setOpen(null)}
      />
    ) : null
  }
}
