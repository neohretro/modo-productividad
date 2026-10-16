import {
  CheckCheck,
  Clock,
  Flame,
  FolderKanban,
  Lightbulb,
  Lock,
  Moon,
  Rocket,
  Star,
  Sun,
  Target,
  Trophy
} from 'lucide-react'
import type { Achievement } from '@shared/game'
import { formatDurationLong } from '@shared/focus'
import { fmtHour, type RecArea } from '@shared/profile'
import type { Summary as SummaryData } from '@shared/insights'
import { LevelBadge, XpBar, useGame } from './GameChips'
import { Bar, Card } from './SummaryUi'

/* ---------- nivel y logros ---------- */

export function LevelCard(): React.JSX.Element {
  const g = useGame()
  return (
    <section className="glass-strong flex shrink-0 flex-wrap items-center gap-5 rounded-card px-5 py-4">
      <LevelBadge level={g.level} size={56} />
      <div className="min-w-[14rem] flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <h3 className="text-lg">
            Nivel {g.level} <span className="text-orange">{g.title}</span>
          </h3>
          <span className="text-xs tabular-nums text-paper-dim">
            {g.xpInLevel} / {g.xpSpan} XP
          </span>
        </div>
        <XpBar g={g} />
        <p className="mt-1.5 text-[11px] text-paper-dim">
          Te faltan {g.xpSpan - g.xpInLevel} XP para ser «{g.nextTitle}». Cada tarea cerrada suma 10
          XP, más extras por enfoque medido y por rescatar tareas viejas.
        </p>
      </div>
      <div className="flex items-center gap-5 text-center">
        <div>
          <p className="flex items-center justify-center gap-1 font-display text-2xl leading-none tabular-nums text-orange">
            <Flame size={18} strokeWidth={2} />
            {g.streakDays}
          </p>
          <p className="mt-1 text-[10px] text-paper-dim">días seguidos</p>
        </div>
        <div>
          <p className="font-display text-2xl leading-none tabular-nums">{g.bestStreak}</p>
          <p className="mt-1 text-[10px] text-paper-dim">mejor racha</p>
        </div>
        <div>
          <p className="font-display text-2xl leading-none tabular-nums">{g.xp}</p>
          <p className="mt-1 text-[10px] text-paper-dim">XP total</p>
        </div>
      </div>
    </section>
  )
}

const ACH_ICON: Record<Achievement['icon'], typeof Star> = {
  check: CheckCheck,
  flame: Flame,
  star: Star,
  clock: Clock,
  sun: Sun,
  moon: Moon,
  folder: FolderKanban,
  rocket: Rocket,
  trophy: Trophy,
  target: Target
}

export function AchievementsCard({ list }: { list: Achievement[] }): React.JSX.Element {
  const got = list.filter((a) => a.unlocked).length
  return (
    <Card title="Logros" hint={`${got} de ${list.length} desbloqueados`}>
      <ul className="grid grid-cols-2 gap-2.5 min-[1000px]:grid-cols-4">
        {list.map((a) => {
          const Icon = a.unlocked ? ACH_ICON[a.icon] : Lock
          return (
            <li
              key={a.id}
              title={a.desc}
              className={`rounded-chip border px-3 py-2.5 ${
                a.unlocked ? 'border-orange/40 bg-orange-soft' : 'border-border bg-ink-soft opacity-80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  size={15}
                  strokeWidth={1.75}
                  className={a.unlocked ? 'shrink-0 text-orange' : 'shrink-0 text-paper-dim'}
                />
                <span className={`truncate text-xs ${a.unlocked ? 'text-paper' : 'text-paper-dim'}`}>
                  {a.title}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-paper-dim">{a.desc}</p>
              {!a.unlocked && (
                <div className="mt-2">
                  <Bar pct={Math.min(1, a.value / a.target)} strong={false} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ---------- perfil de trabajo ---------- */

export function ProfileCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const p = sum.profile
  return (
    <Card title="Tu perfil de trabajo" hint="según cómo cierras tus tareas">
      {!p.chronotype && (
        <p className="mb-3 rounded-chip bg-ink-soft px-3 py-2 text-xs text-paper-dim">
          Con unas {p.needed} tareas cerradas en el período ya puedo decirte tu cronotipo (a qué hora
          rindes mejor).
        </p>
      )}
      <div className="flex flex-col gap-3">
        {p.chronotype && (
          <ProfileRow
            Icon={p.chronotype.id === 'buho' ? Moon : Sun}
            kicker="Cronotipo"
            title={p.chronotype.label}
            desc={p.chronotype.desc}
            source={p.chronotype.source}
            extra={`La mitad de tus tareas ya están cerradas hacia las ${fmtHour(Math.floor(p.chronotype.medianHour))}`}
          />
        )}
        <ProfileRow
          Icon={Target}
          kicker="Estilo de trabajo"
          title={p.style.label}
          desc={p.style.desc}
          source={p.style.source}
        />
      </div>
      <p className="mt-3 text-[10px] leading-snug text-paper-dim">
        Es una lectura orientativa de tus propios datos, no un test clínico.
      </p>
    </Card>
  )
}

function ProfileRow({
  Icon,
  kicker,
  title,
  desc,
  source,
  extra
}: {
  Icon: typeof Sun
  kicker: string
  title: string
  desc: string
  source: string
  extra?: string
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-chip bg-ink-soft px-3 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-orange-soft text-orange">
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-paper-dim">{kicker}</p>
        <p className="text-sm text-paper">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-paper-dim">{desc}</p>
        {extra && <p className="mt-1 text-[11px] text-paper">{extra}</p>}
        {source && <p className="mt-1 text-[10px] text-paper-dim">Fuente: {source}</p>}
      </div>
    </div>
  )
}

/* ---------- recomendaciones ---------- */

const AREA_LABEL: Record<RecArea, string> = {
  productividad: 'Productividad',
  equilibrio: 'Equilibrio',
  enfoque: 'Enfoque',
  hábito: 'Hábito'
}

export function RecommendationsCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  return (
    <Card title="Cómo mejorar" hint="recomendaciones según tu comportamiento">
      <ul className="flex flex-col gap-2.5">
        {sum.recommendations.map((r) => (
          <li key={r.id} className="rounded-chip bg-ink-soft px-3 py-2.5">
            <div className="mb-1 flex items-center gap-2">
              <Lightbulb size={13} strokeWidth={1.75} className="shrink-0 text-orange" />
              <span className="min-w-0 flex-1 truncate text-sm text-paper">{r.title}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${
                  r.area === 'equilibrio' ? 'bg-orange-soft text-orange' : 'bg-ink text-paper-dim'
                }`}
              >
                {AREA_LABEL[r.area]}
              </span>
            </div>
            <p className="text-xs leading-snug text-paper-dim">{r.text}</p>
            {r.source && <p className="mt-1 text-[10px] text-paper-dim">Fuente: {r.source}</p>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ---------- horas de mayor productividad ---------- */

export function HoursCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const max = Math.max(1, ...sum.hourly.map((h) => h.count))
  const peak = sum.peakWindow
  const inPeak = (h: number): boolean => !!peak && h >= peak.from && h < peak.to
  return (
    <Card
      title="Horas de mayor productividad"
      hint={peak ? `tu hora pico: ${fmtHour(peak.from)} a ${fmtHour(peak.to)}` : 'sin datos aún'}
    >
      <div className="flex h-32 items-end gap-[3px]">
        {sum.hourly.map((h) => (
          <div
            key={h.hour}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={`${fmtHour(h.hour)}: ${h.count} ${h.count === 1 ? 'tarea' : 'tareas'} (${h.avgPerActiveDay.toFixed(1)} por día con tareas)`}
          >
            <div
              className={`w-full rounded-t-[3px] ${
                h.count === 0 ? 'bg-ink' : inPeak(h.hour) ? 'bg-orange' : 'bg-orange/50'
              }`}
              style={{ height: h.count === 0 ? '3px' : `${Math.max(8, (h.count / max) * 88)}%` }}
            />
            <span className="h-3 text-[8px] leading-3 text-paper-dim">
              {h.hour % 3 === 0 ? (h.hour === 0 ? '12a' : h.hour === 12 ? '12p' : String(h.hour % 12)) : ''}
            </span>
          </div>
        ))}
      </div>
      {peak && (
        <p className="mt-2 text-xs text-paper-dim">
          Entre {fmtHour(peak.from)} y {fmtHour(peak.to)} cierras el{' '}
          <span className="text-paper">{Math.round(peak.share * 100)}%</span> de tus tareas. Pasa el
          mouse por una barra para ver el promedio por día de esa hora.
        </p>
      )}
    </Card>
  )
}

/* ---------- promedios ---------- */

export function AveragesCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const a = sum.averages
  const f = (n: number): string => (n >= 10 ? String(Math.round(n)) : n.toFixed(1))
  const rows: [string, string][] = [
    ['Tareas por día (todos los días)', f(a.perCalendarDay)],
    ['Tareas por día con actividad', f(a.perActiveDay)],
    ['Tareas por semana', a.perWeek === null ? 'n/d' : f(a.perWeek)],
    [
      'Tiempo por día con actividad',
      a.timePerActiveDayMs === null ? 'n/d' : formatDurationLong(a.timePerActiveDayMs)
    ]
  ]
  return (
    <Card title="Promedios" hint={sum.period === 'all' ? 'global' : sum.rangeLabel}>
      <ul className="flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-paper-dim">{label}</span>
            <span className="font-display text-lg tabular-nums text-paper">{value}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ---------- mejor y peor día de la semana ---------- */

export function WeekCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const max = Math.max(0.0001, ...sum.weekday.map((d) => d.avg))
  return (
    <Card title="Tu semana" hint="promedio de tareas por día">
      <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
        {sum.bestDay ? (
          <span className="rounded-full bg-orange-soft px-2.5 py-1 capitalize text-orange">
            Más trabajas: {sum.bestDay.label} ({sum.bestDay.avg.toFixed(1)})
          </span>
        ) : (
          <span className="text-paper-dim">Con más días de datos verás tu mejor y peor día.</span>
        )}
        {sum.worstDay && (
          <span className="rounded-full bg-ink-soft px-2.5 py-1 capitalize text-paper-dim">
            Menos: {sum.worstDay.label} ({sum.worstDay.avg.toFixed(1)})
          </span>
        )}
      </div>
      <div className="flex h-24 items-end gap-1.5">
        {sum.weekday.map((d) => {
          const best = sum.bestDay?.label === d.label
          return (
            <div
              key={d.dow}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${d.label}: ${d.avg.toFixed(1)} por día (${d.count} en total)`}
            >
              {d.avg > 0 && (
                <span className="text-[9px] tabular-nums text-paper-dim">{d.avg.toFixed(1)}</span>
              )}
              <div
                className={`w-full rounded-t-[4px] ${
                  d.avg === 0 ? 'bg-ink' : best ? 'bg-orange' : 'bg-orange/55'
                }`}
                style={{ height: d.avg === 0 ? '3px' : `${Math.max(10, (d.avg / max) * 70)}%` }}
              />
              <span className="text-[9px] uppercase text-paper-dim">{d.label.slice(0, 1)}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ---------- mañana, tarde o noche ---------- */

export function PartsCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const total = Math.max(1, sum.dayparts.reduce((a, d) => a + d.count, 0))
  const maxPart = Math.max(1, ...sum.dayparts.map((d) => d.count))
  return (
    <Card title="Mañana, tarde o noche">
      <ul className="flex flex-col gap-3">
        {sum.dayparts.map((d) => (
          <li key={d.id}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-paper">
                {d.label} <span className="text-[10px] text-paper-dim">{d.hours}</span>
              </span>
              <span className="tabular-nums text-paper-dim">
                {d.count} · {Math.round((d.count / total) * 100)}%
              </span>
            </div>
            <Bar pct={d.count / maxPart} strong={d.count === maxPart && d.count > 0} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ---------- equilibrio ---------- */

export function BalanceCard({ sum }: { sum: SummaryData }): React.JSX.Element {
  const b = sum.profile.balance
  const items = [
    {
      label: 'Fines de semana',
      value: `${Math.round(b.weekendShare * 100)}%`,
      warn: b.weekendShare >= 0.3,
      note: b.weekendShare >= 0.3 ? 'mucho trabajo' : 'sano'
    },
    {
      label: 'De noche (9 pm a 5 am)',
      value: `${Math.round(b.nightShare * 100)}%`,
      warn: b.nightShare >= 0.25,
      note: b.nightShare >= 0.25 ? 'cuida tu sueño' : 'sano'
    },
    {
      label: 'Días seguidos sin parar',
      value: String(b.maxRun),
      warn: b.maxRun >= 10,
      note: b.maxRun >= 10 ? 'planea descanso' : 'sano'
    }
  ]
  return (
    <Card title="Equilibrio">
      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li key={it.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-paper-dim">{it.label}</span>
              <span className="font-display text-lg tabular-nums text-paper">{it.value}</span>
            </div>
            <span className={`text-[10px] ${it.warn ? 'text-orange' : 'text-paper-dim'}`}>{it.note}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
