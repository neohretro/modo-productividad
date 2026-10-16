import { useEffect, useMemo } from 'react'
import { PartyPopper, Trophy } from 'lucide-react'
import { XP_PERFECT_DAY } from '@shared/game'
import { useAppStore } from '../store/useAppStore'

const COLORS = ['var(--orange)', '#ffb347', '#ffd9a0', 'var(--paper)', '#ff6a00']

/**
 * Premio al cerrar una tarea: "+10 XP" con un poco de confeti. Si además subes de
 * nivel, haces un día perfecto o desbloqueas un logro, la celebración es más
 * grande. Se desactiva en Ajustes y respeta "reducir movimiento" del sistema.
 */
export default function RewardToast({ compact = false }: { compact?: boolean }): React.JSX.Element | null {
  const reward = useAppStore((s) => s.reward)
  const clear = useAppStore((s) => s.clearReward)

  const big = !!reward && (reward.levelUp !== null || reward.perfectDay || reward.achievements.length > 0)

  useEffect(() => {
    if (!reward) return
    const t = window.setTimeout(clear, big ? 5200 : 2600)
    return () => window.clearTimeout(t)
  }, [reward, big, clear])

  const bits = useMemo(() => {
    if (!reward) return []
    const n = big ? 36 : 14
    return Array.from({ length: n }, (_, i) => {
      const angle = Math.random() * Math.PI * 2
      const dist = (big ? 110 : 70) + Math.random() * (big ? 120 : 60)
      return {
        key: i,
        dx: Math.round(Math.cos(angle) * dist),
        dy: Math.round(Math.sin(angle) * dist - 40),
        rot: Math.round((Math.random() - 0.5) * 720),
        delay: Math.round(Math.random() * 120),
        color: COLORS[i % COLORS.length]
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward?.id])

  if (!reward) return null

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-50 flex justify-center px-3 ${
        compact ? 'top-20' : 'top-16'
      }`}
    >
      <div key={reward.id} className="relative animate-pop">
        {bits.map((b) => (
          <span
            key={b.key}
            className="confetti-bit"
            style={
              {
                background: b.color,
                '--dx': `${b.dx}px`,
                '--dy': `${b.dy}px`,
                '--rot': `${b.rot}deg`,
                '--delay': `${b.delay}ms`
              } as React.CSSProperties
            }
          />
        ))}

        <div className="glass-strong relative flex flex-col items-center gap-1 rounded-card px-5 py-3 text-center shadow-[0_14px_40px_-12px_rgba(255,140,0,0.55)]">
          {reward.xp > 0 && (
            <p className={`font-display leading-none text-orange ${compact ? 'text-2xl' : 'text-3xl'}`}>
              +{reward.xp} XP
            </p>
          )}
          {reward.perfectDay && (
            <p className="flex items-center gap-1.5 text-xs text-paper">
              <PartyPopper size={13} strokeWidth={1.75} className="text-orange" />
              ¡Día perfecto! +{XP_PERFECT_DAY} XP de bonus
            </p>
          )}
          {reward.levelUp && (
            <p className="text-sm text-paper">
              ¡Subiste al nivel {reward.levelUp.level}:{' '}
              <span className="text-orange">{reward.levelUp.title}</span>!
            </p>
          )}
          {reward.achievements.map((a) => (
            <p key={a.id} className="flex items-center gap-1.5 text-xs text-paper">
              <Trophy size={13} strokeWidth={1.75} className="text-orange" />
              Logro: <span className="text-orange">{a.title}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
