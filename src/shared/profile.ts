/**
 * Perfil de trabajo y recomendaciones, a partir de CÓMO trabajas (cuándo cierras
 * tus tareas, cuánto duran, qué tan constante eres...). Es una lectura
 * orientativa de tus propios datos, no un test clínico ni un diagnóstico.
 *
 * Los conceptos están inspirados en investigación conocida, y se cita la fuente
 * en cada caso para que puedas leer más:
 *  - Cronotipo: Horne y Östberg (1976), cuestionario de matutinidad y
 *    vespertinidad; Roenneberg y colegas (cronotipos, 2003-2007).
 *  - Ciclos de ~90 min de energía y descanso: Kleitman (1963).
 *  - Trabajo profundo: Cal Newport, "Deep Work" (2016).
 *  - Recuperación del trabajo: Sonnentag (2003).
 *  - Limitar el trabajo en curso: método Kanban.
 *  - Hábitos pequeños: B. J. Fogg, "Tiny Habits" (2019).
 */

export interface ProfileInput {
  completed: number
  /** días del período. */
  days: number
  activeDays: number
  /** tareas cerradas por hora local del día (24). */
  hourly: number[]
  /** tareas cerradas por día de la semana (0 = lunes). */
  weekdayCounts: number[]
  timeMs: number
  trackedCount: number
  avgTaskMs: number | null
  coverage: number
  created: number
  backlogLoose: number
  /** racha más larga de días seguidos con tareas cerradas dentro del período. */
  maxRun: number
  /** máximo de tareas cerradas en un solo día. */
  maxInDay: number
  topProjectShare: number
  projectsUsed: number
  hasProjects: boolean
}

export interface Chronotype {
  id: 'alondra' | 'diurno' | 'vespertino' | 'buho'
  label: string
  /** hora mediana de cierre, p. ej. 10.5. */
  medianHour: number
  desc: string
  source: string
}

export interface WorkStyle {
  id: 'profundo' | 'lotes' | 'impulsos' | 'constante' | 'formandose'
  label: string
  desc: string
  source: string
}

export interface Balance {
  /** fracción de tareas cerradas en sábado o domingo. */
  weekendShare: number
  /** fracción cerrada entre las 9 pm y las 5 am. */
  nightShare: number
  /** días seguidos sin parar (con tareas cerradas). */
  maxRun: number
}

export interface WorkProfile {
  /** null si todavía no hay datos suficientes. */
  chronotype: Chronotype | null
  style: WorkStyle
  balance: Balance
  /** cuántas tareas cerradas hacen falta para una lectura confiable. */
  needed: number
}

export type RecArea = 'productividad' | 'equilibrio' | 'enfoque' | 'hábito'

export interface Recommendation {
  id: string
  area: RecArea
  title: string
  text: string
  source?: string
}

export const MIN_FOR_PROFILE = 8

export function fmtHour(h: number): string {
  const hh = ((h % 24) + 24) % 24
  const suffix = hh < 12 ? 'am' : 'pm'
  const base = hh % 12 === 0 ? 12 : hh % 12
  return `${base} ${suffix}`
}

/** Hora (decimal) a la que ya llevas la mitad de tus tareas cerradas. */
export function medianHour(hourly: number[]): number | null {
  const total = hourly.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  let acc = 0
  for (let h = 0; h < 24; h++) {
    acc += hourly[h]
    if (acc >= total / 2) return h + 0.5
  }
  return null
}

/** La franja de 2 horas seguidas donde más tareas cierras. */
export function peakWindow(
  hourly: number[]
): { from: number; to: number; count: number; share: number } | null {
  const total = hourly.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  let best = 0
  let bestSum = -1
  for (let h = 0; h < 23; h++) {
    const sum = hourly[h] + hourly[h + 1]
    if (sum > bestSum) {
      bestSum = sum
      best = h
    }
  }
  return { from: best, to: best + 2, count: bestSum, share: bestSum / total }
}

function chronotypeOf(median: number): Chronotype {
  if (median < 10) {
    return {
      id: 'alondra',
      label: 'Alondra (matutino)',
      medianHour: median,
      desc: 'Rindes más temprano. Tu mejor energía está en la mañana: reserva esas horas para lo que más piensa.',
      source: 'Horne y Östberg, 1976'
    }
  }
  if (median < 15) {
    return {
      id: 'diurno',
      label: 'Diurno (intermedio)',
      medianHour: median,
      desc: 'Tu actividad se concentra a media jornada. Es el patrón más común y se adapta bien a horarios normales.',
      source: 'Roenneberg y colegas, 2003 a 2007'
    }
  }
  if (median < 20) {
    return {
      id: 'vespertino',
      label: 'Vespertino (tarde)',
      medianHour: median,
      desc: 'Arrancas más tarde y rindes mejor en la tarde. Intenta no llenar tus mañanas de tareas exigentes.',
      source: 'Horne y Östberg, 1976'
    }
  }
  return {
    id: 'buho',
    label: 'Búho (nocturno)',
    medianHour: median,
    desc: 'Tu energía llega tarde en el día. Funciona si lo eliges, pero cuida el sueño para que no te pase factura.',
    source: 'Roenneberg y colegas, 2003 a 2007'
  }
}

function styleOf(i: ProfileInput): WorkStyle {
  const perActive = i.activeDays > 0 ? i.completed / i.activeDays : 0
  const presence = i.days > 0 ? i.activeDays / i.days : 0

  if (i.completed < MIN_FOR_PROFILE) {
    return {
      id: 'formandose',
      label: 'Tu estilo se está formando',
      desc: `Cierra ${MIN_FOR_PROFILE - i.completed} tareas más en este período y te digo cómo trabajas.`,
      source: ''
    }
  }
  if (i.avgTaskMs !== null && i.trackedCount >= 3 && i.avgTaskMs >= 45 * 60_000) {
    return {
      id: 'profundo',
      label: 'Enfoque profundo',
      desc: 'Pocas tareas, pero largas y concentradas. Ideal para trabajo creativo: protege esos bloques de interrupciones.',
      source: 'Cal Newport, Deep Work, 2016'
    }
  }
  if (perActive >= 6 && (i.avgTaskMs === null || i.avgTaskMs < 20 * 60_000)) {
    return {
      id: 'lotes',
      label: 'Cazador de pendientes',
      desc: 'Cierras muchas tareas cortas por día. Agruparlas por tipo (mensajes, ediciones, publicaciones) te ahorra cambios de contexto.',
      source: 'Trabajo por lotes (batching)'
    }
  }
  if (i.days >= 14 && presence <= 0.4 && i.maxInDay >= 0.3 * i.completed) {
    return {
      id: 'impulsos',
      label: 'Sprinter (trabajas por impulsos)',
      desc: 'Concentras el trabajo en pocos días intensos. Funciona, pero conviene repartirlo para que no dependa de tener un buen día.',
      source: 'B. J. Fogg, Tiny Habits, 2019'
    }
  }
  if (presence >= 0.7) {
    return {
      id: 'constante',
      label: 'Constante',
      desc: 'Avanzas casi todos los días a un ritmo parejo. Es el estilo que mejor se sostiene en el tiempo.',
      source: ''
    }
  }
  return {
    id: 'formandose',
    label: 'Ritmo mixto',
    desc: 'Alternas días activos con días tranquilos. Elige 1 tarea mínima diaria para ganar regularidad.',
    source: 'B. J. Fogg, Tiny Habits, 2019'
  }
}

export function buildProfile(i: ProfileInput): WorkProfile {
  const total = i.completed
  const weekend = (i.weekdayCounts[5] ?? 0) + (i.weekdayCounts[6] ?? 0)
  const night = [21, 22, 23, 0, 1, 2, 3, 4].reduce((a, h) => a + (i.hourly[h] ?? 0), 0)
  const m = medianHour(i.hourly)
  return {
    chronotype: total >= MIN_FOR_PROFILE && m !== null ? chronotypeOf(m) : null,
    style: styleOf(i),
    balance: {
      weekendShare: total === 0 ? 0 : weekend / total,
      nightShare: total === 0 ? 0 : night / total,
      maxRun: i.maxRun
    },
    needed: MIN_FOR_PROFILE
  }
}

const pct = (n: number): string => `${Math.round(n * 100)}%`

/** Recomendaciones personalizadas, de mayor a menor prioridad (máximo 8). */
export function buildRecommendations(i: ProfileInput, profile: WorkProfile): Recommendation[] {
  const recs: Recommendation[] = []
  if (i.completed < 4) {
    return [
      {
        id: 'start',
        area: 'hábito',
        title: 'Empieza pequeño',
        text: 'Cierra al menos una tarea al día durante una semana. Con pocas tareas aún no hay datos para recomendarte, pero la constancia es lo que más pesa.',
        source: 'B. J. Fogg, Tiny Habits, 2019'
      }
    ]
  }

  const peak = peakWindow(i.hourly)
  if (peak && peak.share >= 0.25) {
    recs.push({
      id: 'peak',
      area: 'productividad',
      title: `Protege tu hora pico: ${fmtHour(peak.from)} a ${fmtHour(peak.to)}`,
      text: `Ahí cierras el ${pct(peak.share)} de tus tareas. Reserva esa franja para lo más importante o creativo y deja lo mecánico (mensajes, ordenar) para otras horas.`,
      source: 'Horne y Östberg, 1976'
    })
  }

  if (profile.balance.weekendShare >= 0.3 && i.days >= 7) {
    recs.push({
      id: 'weekend',
      area: 'equilibrio',
      title: 'Cuida tus fines de semana',
      text: `El ${pct(profile.balance.weekendShare)} de lo que cierras es en sábado o domingo. Descansar de verdad un día completo ayuda a rendir mejor la semana siguiente.`,
      source: 'Sonnentag, 2003'
    })
  }

  if (profile.balance.nightShare >= 0.25) {
    recs.push({
      id: 'night',
      area: 'equilibrio',
      title: 'Mucho trabajo de noche',
      text: `El ${pct(profile.balance.nightShare)} de tus tareas se cierra entre las 9 pm y las 5 am. Si puedes, mueve lo importante antes de la noche para proteger tu sueño.`
    })
  }

  if (profile.balance.maxRun >= 10) {
    recs.push({
      id: 'rest',
      area: 'equilibrio',
      title: `${profile.balance.maxRun} días seguidos sin parar`,
      text: 'Hiciste una racha larguísima. Está bien, pero planea un día de descanso real para que la energía no se agote.',
      source: 'Sonnentag, 2003'
    })
  }

  if (i.avgTaskMs !== null && i.avgTaskMs >= 90 * 60_000) {
    recs.push({
      id: 'breaks',
      area: 'enfoque',
      title: 'Haz pausas en tus tareas largas',
      text: 'Tus tareas con cronómetro pasan de 90 minutos en promedio. Cada 90 minutos descansa 10 a 15: el cuerpo trabaja en ciclos y rindes más con pausas.',
      source: 'Kleitman, 1963'
    })
  }

  if (i.created > 0 && i.created >= i.completed * 1.5 && i.created - i.completed >= 4) {
    recs.push({
      id: 'wip',
      area: 'productividad',
      title: 'Creas más de lo que cierras',
      text: `Agregaste ${i.created} tareas y cerraste ${i.completed}. Limita lo que pones en tu día (3 a 5 tareas) para terminarlas, en vez de acumular.`,
      source: 'Kanban: limitar el trabajo en curso'
    })
  }

  if (i.backlogLoose >= 8) {
    recs.push({
      id: 'plan',
      area: 'productividad',
      title: 'Planea tu semana',
      text: `Tienes ${i.backlogLoose} tareas sin día. Dedica 10 minutos el lunes a asignarlas a la Semana: lo que tiene fecha se hace.`
    })
  }

  if (i.completed >= 6 && i.coverage < 0.3) {
    recs.push({
      id: 'measure',
      area: 'enfoque',
      title: 'Mide más tareas con el cronómetro',
      text: 'Solo una parte de tus tareas tiene tiempo medido. Dale ▶ al empezar y aquí verás cuáles te toman más y cuánto rindes de verdad.'
    })
  }

  if (i.hasProjects && i.projectsUsed >= 2 && i.topProjectShare >= 0.7) {
    recs.push({
      id: 'focusproject',
      area: 'equilibrio',
      title: 'Casi todo tu trabajo va a un solo proyecto',
      text: `El ${pct(i.topProjectShare)} de lo que cierras es del mismo proyecto. Revisa si los demás necesitan al menos una tarea por semana.`
    })
  }

  if (i.days >= 14 && i.activeDays / i.days <= 0.4) {
    recs.push({
      id: 'habit',
      area: 'hábito',
      title: 'Vuelve el hábito más fácil',
      text: 'Hay muchos días sin tareas cerradas. Define una tarea mínima diaria (5 minutos) para mantener el ritmo sin esfuerzo.',
      source: 'B. J. Fogg, Tiny Habits, 2019'
    })
  }

  if (profile.style.id === 'lotes') {
    recs.push({
      id: 'batch',
      area: 'enfoque',
      title: 'Agrupa tareas parecidas',
      text: 'Haz juntas las de mensajes, juntas las de edición y juntas las de publicación. Cambiar de tipo de tarea cuesta tiempo y energía.'
    })
  }

  if (profile.style.id === 'profundo') {
    recs.push({
      id: 'deep',
      area: 'enfoque',
      title: 'Cuida tus bloques de enfoque',
      text: 'Trabajas bien en bloques largos. Apaga notificaciones durante ese rato y agenda tus tareas importantes ahí.',
      source: 'Cal Newport, Deep Work, 2016'
    })
  }

  if (recs.length === 0) {
    recs.push({
      id: 'keep',
      area: 'hábito',
      title: 'Vas bien: mantén el ritmo',
      text: 'No veo señales de alerta en tu forma de trabajar. Sigue cerrando tareas a tu ritmo y revisa este resumen cada semana.'
    })
  }
  return recs.slice(0, 8)
}
