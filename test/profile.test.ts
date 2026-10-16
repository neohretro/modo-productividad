import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  buildProfile,
  buildRecommendations,
  fmtHour,
  medianHour,
  peakWindow,
  type ProfileInput
} from '@shared/profile'
import { buildSummary } from '@shared/insights'
import { state, task } from './helpers'

const hours = (spec: Record<number, number>): number[] =>
  Array.from({ length: 24 }, (_, h) => spec[h] ?? 0)

function input(over: Partial<ProfileInput> = {}): ProfileInput {
  return {
    completed: 12,
    days: 14,
    activeDays: 8,
    hourly: hours({ 10: 12 }),
    weekdayCounts: [2, 2, 2, 2, 2, 1, 1],
    timeMs: 0,
    trackedCount: 0,
    avgTaskMs: null,
    coverage: 0,
    created: 12,
    backlogLoose: 0,
    maxRun: 3,
    maxInDay: 3,
    topProjectShare: 0.4,
    projectsUsed: 2,
    hasProjects: true,
    ...over
  }
}

test('hora mediana y franja pico', () => {
  const h = hours({ 9: 4, 10: 6, 11: 2 })
  assert.equal(medianHour(h), 10.5)
  assert.deepEqual(peakWindow(h), { from: 9, to: 11, count: 10, share: 10 / 12 })
  assert.equal(medianHour(hours({})), null)
  assert.equal(peakWindow(hours({})), null)
  assert.equal(fmtHour(0), '12 am')
  assert.equal(fmtHour(13), '1 pm')
})

test('cronotipo según la hora a la que cierras tus tareas', () => {
  const at = (spec: Record<number, number>) =>
    buildProfile(input({ hourly: hours(spec), completed: Object.values(spec).reduce((a, b) => a + b, 0) }))
  assert.equal(at({ 7: 6, 8: 4 }).chronotype?.id, 'alondra')
  assert.equal(at({ 11: 5, 13: 5 }).chronotype?.id, 'diurno')
  assert.equal(at({ 16: 5, 18: 5 }).chronotype?.id, 'vespertino')
  assert.equal(at({ 22: 6, 23: 4 }).chronotype?.id, 'buho')
})

test('con pocas tareas no se inventa un perfil', () => {
  const p = buildProfile(input({ completed: 3, hourly: hours({ 10: 3 }) }))
  assert.equal(p.chronotype, null)
  assert.equal(p.style.id, 'formandose')
  assert.match(p.style.desc, /5 tareas más/)
})

test('estilo de trabajo: profundo, por lotes, constante e impulsos', () => {
  assert.equal(buildProfile(input({ avgTaskMs: 60 * 60_000, trackedCount: 5 })).style.id, 'profundo')
  assert.equal(buildProfile(input({ completed: 60, activeDays: 8, avgTaskMs: 8 * 60_000, trackedCount: 5 })).style.id, 'lotes')
  assert.equal(buildProfile(input({ completed: 20, days: 14, activeDays: 12, avgTaskMs: null })).style.id, 'constante')
  assert.equal(buildProfile(input({ completed: 20, days: 30, activeDays: 4, maxInDay: 9, avgTaskMs: null })).style.id, 'impulsos')
})

test('equilibrio: fin de semana, noche y racha sin parar', () => {
  const p = buildProfile(
    input({ completed: 10, weekdayCounts: [1, 1, 1, 1, 1, 3, 2], hourly: hours({ 22: 4, 10: 6 }), maxRun: 12 })
  )
  assert.equal(p.balance.weekendShare, 0.5)
  assert.equal(p.balance.nightShare, 0.4)
  assert.equal(p.balance.maxRun, 12)
})

test('recomendaciones: salen de los datos y citan su fuente', () => {
  const i = input({
    completed: 20,
    created: 40,
    weekdayCounts: [1, 1, 1, 1, 1, 8, 7],
    hourly: hours({ 22: 8, 10: 12 }),
    maxRun: 11,
    backlogLoose: 9,
    avgTaskMs: 100 * 60_000,
    trackedCount: 4,
    coverage: 0.2
  })
  const ids = buildRecommendations(i, buildProfile(i)).map((r) => r.id)
  for (const id of ['peak', 'weekend', 'night', 'rest', 'breaks', 'wip', 'plan', 'measure']) {
    assert.ok(ids.includes(id), `falta ${id}`)
  }
  const rec = buildRecommendations(i, buildProfile(i)).find((r) => r.id === 'weekend')!
  assert.match(rec.source ?? '', /Sonnentag/)
  assert.ok(buildRecommendations(i, buildProfile(i)).length <= 8)
})

test('con muy pocos datos solo recomienda empezar pequeño', () => {
  const r = buildRecommendations(input({ completed: 2 }), buildProfile(input({ completed: 2 })))
  assert.equal(r.length, 1)
  assert.equal(r[0].id, 'start')
})

test('el resumen trae horas, mejor/peor día, promedios y perfil', () => {
  const NOW = new Date('2026-08-28T12:00:00')
  const done = (day: string, hour: number) =>
    task({ done: true, scheduledDate: day, completedDate: `${day}T${String(hour).padStart(2, '0')}:00:00` })
  const s = state({
    tasks: [
      // miércoles 26 (3), viernes 28 (1), lunes 24 (2); todos por la mañana
      done('2026-08-26', 9), done('2026-08-26', 9), done('2026-08-26', 10),
      done('2026-08-28', 10),
      done('2026-08-24', 8), done('2026-08-24', 9),
      done('2026-08-27', 8), done('2026-08-27', 9)
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.equal(sum.hourly.length, 24)
  assert.equal(sum.hourly[9].count, 4)
  assert.equal(sum.peakWindow?.count, 6)
  assert.equal(sum.weekday[2].avg, 3, 'miércoles: 3 tareas en 1 miércoles')
  assert.equal(sum.bestDay?.label, 'miércoles')
  assert.ok(sum.worstDay)
  assert.notEqual(sum.worstDay?.label, 'miércoles')
  assert.equal(sum.averages.perActiveDay, 2)
  assert.equal(sum.averages.perWeek, 8)
  assert.equal(sum.profile.chronotype?.id, 'alondra')
  assert.ok(sum.recommendations.length >= 1)
})
