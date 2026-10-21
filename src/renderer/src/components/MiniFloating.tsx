import { useEffect, useMemo, useState } from 'react'
import { Maximize2, Minus, Pin, PinOff, Power } from 'lucide-react'
import { ALL_TASKS_ID, TODAY_PROJECT_ID } from '@shared/types'
import { toISODate } from '@shared/date'
import { focusSortRank } from '@shared/focus'
import { targetView, useAppStore } from '../store/useAppStore'
import ProgressRing from './ProgressRing'
import FocusTaskRow from './FocusTaskRow'
import MultitaskNudge from './MultitaskNudge'
import CompletionToast from './CompletionToast'
import FlashToast from './FlashToast'
import RewardToast from './RewardToast'
import { LevelBadge, useGame } from './GameChips'
import { Flame } from 'lucide-react'
import AddTask from './AddTask'
import Dropdown from './Dropdown'
import UpdateBanner from './UpdateBanner'
import { ContextMenu, MenuItem, MenuSep, type MenuPos } from './ContextMenu'
import { useDragAnywhere } from '../hooks/useDragAnywhere'

// El rollover diario lo maneja solo la ventana principal; el mini recibe el
// estado ya actualizado por el broadcast store:changed.

export default function MiniFloating(): React.JSX.Element {
  const hydrated = useAppStore((s) => s.hydrated)
  const hydrate = useAppStore((s) => s.hydrate)
  const projects = useAppStore((s) => s.projects)
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const miniTargetId = useAppStore((s) => s.miniTargetId)
  const setMiniTarget = useAppStore((s) => s.setMiniTarget)
  const addTask = useAppStore((s) => s.addTask)
  const game = useGame()
  const pinned = useAppStore((s) => s.settings.miniPinned)
  const setMiniPinned = useAppStore((s) => s.setMiniPinned)
  const dragAnywhere = useDragAnywhere()
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const view = useMemo(
    () => targetView({ tasks, archivedTasks, projects, miniTargetId }),
    [tasks, archivedTasks, projects, miniTargetId]
  )

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const pending = view.tasks.filter((t) => !t.done)
  const done = view.tasks.length - pending.length
  const pct = view.tasks.length === 0 ? 0 : done / view.tasks.length
  const focusing = pending.filter((t) => t.focusStartedAt !== null)

  // En curso primero, luego en pausa, luego el resto.
  const ordered = [...pending].sort((a, b) => focusSortRank(a) - focusSortRank(b))

  // Al agregar: en Hoy = para hoy; en un proyecto = con su etiqueta y sin día
  // (suelta, se asigna a un día después); en "Todas las tareas" = suelta sin etiqueta.
  const onAdd = (text: string): void => {
    if (view.id === TODAY_PROJECT_ID) addTask(text, { projectId: null, date: toISODate() })
    else if (view.id === ALL_TASKS_ID) addTask(text, { projectId: null, date: null })
    else addTask(text, { projectId: view.id, date: null })
  }

  return (
    // Mover la ventana: por código (`useDragAnywhere`) desde cualquier parte que no sea un
    // control. NO se usan zonas `drag` del CSS: le quitan al contenido la rueda/trackpad y el
    // clic derecho (en Mac el scroll "a veces no respondía" y en Windows salía el menú del sistema).
    <div {...dragAnywhere} className="flex h-screen w-screen p-2">
      <div
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuPos({ x: e.clientX, y: e.clientY })
        }}
        className="frost relative flex h-full w-full flex-col overflow-hidden rounded-[22px]"
      >
        {/* resplandor detrás del anillo — caja cuadrada, se desvanece dentro de sí */}
        <div
          className="ring-halo pointer-events-none absolute left-1/2 top-[112px] h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        />
        <header className="relative flex items-center justify-between gap-2 px-3 pb-1.5 pt-2.5">
          <Dropdown
            className="min-w-0 flex-1"
            value={miniTargetId}
            onChange={setMiniTarget}
            options={[
              { value: TODAY_PROJECT_ID, label: 'Hoy' },
              { value: ALL_TASKS_ID, label: 'Todas las tareas' },
              ...projects.map((p) => ({ value: p.id, label: p.name }))
            ]}
          />
          <button
            aria-label={pinned ? 'Dejar siempre visible' : 'Fijar en el escritorio'}
            title={
              pinned
                ? 'Fijada en el escritorio · clic para que vuelva a flotar sobre todo'
                : 'Fijar en el escritorio (sin flotar sobre las demás ventanas)'
            }
            onClick={() => setMiniPinned(!pinned)}
            className={`no-drag grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-ink-glass ${
              pinned ? 'text-orange' : 'text-paper-dim hover:text-paper'
            }`}
          >
            {pinned ? <Pin size={13} strokeWidth={2} /> : <PinOff size={13} strokeWidth={1.75} />}
          </button>
          <button
            aria-label="Abrir ventana completa"
            onClick={() => window.modo?.exitMiniMode()}
            className="no-drag grid h-6 w-6 shrink-0 place-items-center rounded-md text-paper-dim transition-colors hover:bg-ink-glass hover:text-paper"
          >
            <Maximize2 size={13} strokeWidth={1.75} />
          </button>
        </header>

        <UpdateBanner compact />

        <div className="relative grid place-items-center pb-3 pt-1">
          <ProgressRing
            pct={pct}
            size={132}
            stroke={6}
            label={view.name}
            sub={`${done}/${view.tasks.length}`}
          />
        </div>

        <div className="relative -mt-1 flex items-center justify-center gap-2 pb-2 text-[10px] text-paper-dim">
          <LevelBadge level={game.level} size={18} />
          <span className="text-paper">{game.title}</span>
          <span className="tabular-nums">
            {game.xpInLevel}/{game.xpSpan} XP
          </span>
          {game.streakDays > 0 && (
            <span
              className={`flex items-center gap-0.5 tabular-nums ${game.streakAtRisk ? 'text-orange' : 'text-orange'}`}
              title={game.streakAtRisk ? 'Cierra una tarea hoy para mantener tu racha' : 'Días seguidos'}
            >
              <Flame size={11} strokeWidth={2} />
              {game.streakDays}
            </span>
          )}
        </div>

        <div className="relative min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pt-1">
          {hydrated && focusing.length >= 2 && <MultitaskNudge count={focusing.length} />}

          {hydrated && ordered.length === 0 ? (
            <p className="px-1 py-5 text-center text-xs text-paper-dim">
              {view.tasks.length === 0 ? 'Sin tareas. Agrega una abajo.' : '¡Todo cerrado!'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {ordered.map((t) => (
                <FocusTaskRow key={t.id} task={t} showDay={view.id !== TODAY_PROJECT_ID} />
              ))}
            </ul>
          )}
        </div>

        <div className="px-3 pb-2.5 pt-1">
          <AddTask
            compact
            onAdd={onAdd}
            placeholder={`Agregar a ${view.name}`}
          />
        </div>

        {menuPos && (
          <ContextMenu pos={menuPos} onClose={() => setMenuPos(null)}>
            <MenuItem
              Icon={pinned ? PinOff : Pin}
              label={pinned ? 'Dejar siempre visible' : 'Fijar en el escritorio'}
              onClick={() => {
                setMiniPinned(!pinned)
                setMenuPos(null)
              }}
            />
            <MenuItem
              Icon={Maximize2}
              label="Abrir ventana completa"
              onClick={() => window.modo?.exitMiniMode()}
            />
            <MenuSep />
            <MenuItem
              Icon={Minus}
              label="Minimizar"
              onClick={() => {
                setMenuPos(null)
                window.modo?.hideMini()
              }}
            />
            <MenuItem
              Icon={Power}
              label="Cerrar la app"
              danger
              onClick={() => window.modo?.quitApp()}
            />
          </ContextMenu>
        )}

        <CompletionToast compact />
        <FlashToast />
        <RewardToast compact />
      </div>
    </div>
  )
}
