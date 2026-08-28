import { useState } from 'react'
import type { Task } from '@shared/types'
import TaskContextMenu from '../components/TaskContextMenu'
import type { MenuPos } from '../components/ContextMenu'

/**
 * Clic derecho sobre una tarea → menú contextual. Devuelve el handler para el
 * `onContextMenu` de la fila y el elemento del menú (o null).
 */
export function useTaskMenu(task: Task): {
  onContextMenu: (e: React.MouseEvent) => void
  menu: React.JSX.Element | null
} {
  const [pos, setPos] = useState<MenuPos | null>(null)
  return {
    onContextMenu: (e) => {
      e.preventDefault()
      e.stopPropagation()
      setPos({ x: e.clientX, y: e.clientY })
    },
    menu: pos ? <TaskContextMenu task={task} pos={pos} onClose={() => setPos(null)} /> : null
  }
}
