import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { computeGame, type GameState } from '@shared/game'
import { useAppStore } from '../store/useAppStore'

/** El juego (nivel, XP, días seguidos), calculado de tus tareas. */
export function useGame(): GameState {
  const tasks = useAppStore((s) => s.tasks)
  const archivedTasks = useAppStore((s) => s.archivedTasks)
  const snapshots = useAppStore((s) => s.snapshots)
  return useMemo(
    () => computeGame({ tasks, archivedTasks, snapshots }),
    [tasks, archivedTasks, snapshots]
  )
}

/** Medalla redonda con el número de nivel. */
export function LevelBadge({ level, size = 36 }: { level: number; size?: number }): React.JSX.Element {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-orange font-display text-onaccent shadow-[0_4px_14px_-4px_rgba(255,140,0,0.7)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      aria-label={`Nivel ${level}`}
    >
      {level}
    </span>
  )
}

/** Barra de XP hacia el siguiente nivel. */
export function XpBar({ g, className = '' }: { g: GameState; className?: string }): React.JSX.Element {
  const pct = g.xpSpan === 0 ? 0 : Math.min(1, g.xpInLevel / g.xpSpan)
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-ink ${className}`}>
      <div
        className="h-full rounded-full bg-orange transition-[width] duration-700 ease-modo"
        style={{ width: `${Math.max(3, Math.round(pct * 100))}%` }}
      />
    </div>
  )
}

/** Nivel + barra de XP + días seguidos, en una tarjetita. */
export default function GameChips({ g }: { g: GameState }): React.JSX.Element {
  const streakTitle = g.streakAtRisk
    ? `Cierra una tarea hoy para mantener tu racha de ${g.streakDays} ${g.streakDays === 1 ? 'día' : 'días'}`
    : g.streakDays > 0
      ? `${g.streakDays} ${g.streakDays === 1 ? 'día' : 'días'} seguidos cerrando tareas`
      : 'Cierra una tarea hoy para empezar tu racha'

  return (
    <div className="flex items-center gap-4">
      <div className="flex min-w-[11rem] items-center gap-3" title={`${g.xp} XP en total`}>
        <LevelBadge level={g.level} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs text-paper">{g.title}</span>
            <span className="shrink-0 text-[10px] tabular-nums text-paper-dim">
              {g.xpInLevel}/{g.xpSpan} XP
            </span>
          </div>
          <XpBar g={g} />
        </div>
      </div>

      <div
        title={streakTitle}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs tabular-nums ${
          g.streakAtRisk
            ? 'animate-glow border-dashed border-orange text-orange'
            : g.streakDays > 0
              ? 'border-orange/40 bg-orange-soft text-orange'
              : 'border-border-hi text-paper-dim'
        }`}
      >
        <Flame size={14} strokeWidth={2} />
        {g.streakDays}
        <span className="hidden text-[10px] min-[1000px]:inline">
          {g.streakDays === 1 ? 'día' : 'días'}
        </span>
      </div>
    </div>
  )
}
