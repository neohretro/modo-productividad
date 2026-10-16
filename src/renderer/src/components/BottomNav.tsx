import { BarChart3, CalendarCheck, CalendarDays, FolderKanban } from 'lucide-react'
import { ALL_TASKS_ID } from '@shared/types'
import { useAppStore } from '../store/useAppStore'

const ITEMS = [
  { id: 'today', label: 'Hoy', Icon: CalendarCheck },
  { id: 'week', label: 'Semana', Icon: CalendarDays },
  { id: 'projects', label: 'Proyectos', Icon: FolderKanban },
  { id: 'summary', label: 'Resumen', Icon: BarChart3 }
] as const

export default function BottomNav(): React.JSX.Element {
  const screen = useAppStore((s) => s.screen)
  const setScreen = useAppStore((s) => s.setScreen)
  const setActiveProject = useAppStore((s) => s.setActiveProject)

  return (
    <nav className="glass no-drag mx-auto mt-2 flex w-fit items-center gap-1 rounded-pill p-1">
      {ITEMS.map(({ id, label, Icon }) => {
        const active = screen === id
        return (
          <button
            key={id}
            onClick={() => {
              // Tocar Proyectos siempre vuelve a la lista de proyectos.
              if (id === 'projects') setActiveProject(ALL_TASKS_ID)
              setScreen(id)
            }}
            className={`flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-xs transition-colors duration-200 ease-modo ${
              active ? 'bg-ink-glass-strong text-paper' : 'text-paper-dim hover:text-paper'
            }`}
          >
            <Icon
              size={15}
              strokeWidth={1.75}
              className={active ? 'text-orange' : ''}
            />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
