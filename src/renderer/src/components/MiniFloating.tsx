import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Maximize2 } from 'lucide-react'
import { TODAY_PROJECT_ID } from '@shared/types'
import { todayProjectTasks } from '@shared/focus'
import { targetView, useAppStore } from '../store/useAppStore'
import ProgressRing from './ProgressRing'
import FocusTaskRow from './FocusTaskRow'
import MultitaskNudge from './MultitaskNudge'
import CompletionToast from './CompletionToast'
import FlashToast from './FlashToast'
import AddTask from './AddTask'
import Dropdown from './Dropdown'
import UpdateBanner from './UpdateBanner'

// El rollover diario lo maneja solo la ventana principal; el mini recibe el
// estado ya actualizado por el broadcast store:changed.

export default function MiniFloating(): React.JSX.Element {
  const hydrated = useAppStore((s) => s.hydrated)
  const hydrate = useAppStore((s) => s.hydrate)
  const projects = useAppStore((s) => s.projects)
  const miniTargetId = useAppStore((s) => s.miniTargetId)
  const setMiniTarget = useAppStore((s) => s.setMiniTarget)
  const addTask = useAppStore((s) => s.addTask)
  const view = useAppStore(useShallow(targetView))

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const pending = view.tasks.filter((t) => !t.done)
  const done = view.tasks.length - pending.length
  const pct = view.tasks.length === 0 ? 0 : done / view.tasks.length

  // En "Hoy", suma las tareas de proyecto que trabajas hoy (con su etiqueta)
  // para poder cerrarlas sin cambiar de lista.
  const extra = useMemo(
    () => (miniTargetId === TODAY_PROJECT_ID ? todayProjectTasks({ projects }) : []),
    [miniTargetId, projects]
  )

  const focusing = [...pending, ...extra].filter((t) => t.focusStartedAt !== null)

  const byFocusFirst = (a: (typeof pending)[number], b: (typeof pending)[number]): number =>
    Number(Boolean(b.focusStartedAt)) - Number(Boolean(a.focusStartedAt))

  const ordered = [...[...extra].sort(byFocusFirst), ...[...pending].sort(byFocusFirst)]

  return (
    <div className="drag flex h-screen w-screen p-2">
      <div className="frost relative flex h-full w-full flex-col overflow-hidden rounded-[22px]">
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
              ...projects.map((p) => ({ value: p.id, label: p.name }))
            ]}
          />
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

        <div className="relative min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pt-1">
          {hydrated && focusing.length >= 2 && <MultitaskNudge count={focusing.length} />}

          {hydrated && ordered.length === 0 ? (
            <p className="px-1 py-5 text-center text-xs text-paper-dim">
              {view.tasks.length === 0 ? 'Sin tareas. Agrega una abajo.' : '¡Todo cerrado!'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {ordered.map((t) => (
                <FocusTaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>

        <div className="px-3 pb-2.5 pt-1">
          <AddTask
            compact
            onAdd={(text) => addTask(text, view.id)}
            placeholder={`Agregar a ${view.name}`}
          />
        </div>

        <CompletionToast compact />
        <FlashToast />
      </div>
    </div>
  )
}
