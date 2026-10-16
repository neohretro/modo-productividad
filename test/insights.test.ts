import { test } from 'vitest'
import assert from 'node:assert/strict'
import { buildSummary } from '@shared/insights'
import { state, task } from './helpers'

const NOW = new Date('2026-08-28T12:00:00')
const proj = (id: string, name: string) => ({ id, name, createdDate: '2026-08-01' })

test('cuenta completadas del período y agrupa por proyecto (etiqueta)', () => {
  const s = state({
    tasks: [
      task({ done: true, completedDate: '2026-08-28T10:00:00', timeSpentMs: 600_000, scheduledDate: '2026-08-28' }),
      task({ done: true, completedDate: '2026-08-27T10:00:00', scheduledDate: '2026-08-28' }),
      task({ done: false, scheduledDate: '2026-08-28' }),
      task({ projectId: 'p1', done: true, completedDate: '2026-08-28T09:00:00', scheduledDate: '2026-08-28' })
    ],
    projects: [proj('p1', 'Planner')]
  })

  const today = buildSummary(s, 'today', NOW)
  assert.equal(today.completedCount, 2)
  assert.equal(today.totalTimeMs, 600_000)
  assert.equal(today.trackedCount, 1)
  assert.deepEqual(today.worked.map((g) => g.projectName).sort(), ['Planner', 'Sin proyecto'])

  const week = buildSummary(s, 'week', NOW)
  assert.equal(week.completedCount, 3)
})

test('el avance de un proyecto cuenta tareas vivas y archivadas con su etiqueta', () => {
  const s = state({
    projects: [proj('p1', 'Gear')],
    tasks: [task({ projectId: 'p1', done: true }), task({ projectId: 'p1' })],
    archivedTasks: [task({ projectId: 'p1', done: true }), task({ projectId: null, done: true })]
  })
  const sum = buildSummary(s, 'week', NOW)
  const p = sum.projectProgress.find((x) => x.id === 'p1')!
  assert.equal(p.total, 3)
  assert.equal(p.done, 2)
})

test('sugerencia: tarea que lleva días rodando', () => {
  const s = state({
    tasks: [task({ text: 'Guion largo', daysRolled: 4, scheduledDate: '2026-08-28' })]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.ok(sum.suggestions.some((x) => x.tone === 'nudge' && x.text.includes('4 días')))
})

test('sugerencia: proyecto sin movimiento', () => {
  const s = state({
    projects: [proj('p1', 'Gear')],
    tasks: [task({ projectId: 'p1', createdDate: '2026-08-15' })]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.ok(sum.suggestions.some((x) => x.text.includes('Gear') && x.text.includes('movimiento')))
})

test('sugerencia: racha en buen ritmo', () => {
  const s = state({ streak: { current: 6, best: 6, lastCountedDate: '2026-08-27', freezesAvailable: 1 } })
  const sum = buildSummary(s, 'week', NOW)
  assert.ok(sum.suggestions.some((x) => x.tone === 'win' && x.text.includes('6 días')))
})

test('consistencia devuelve 14 días', () => {
  const sum = buildSummary(state(), 'week', NOW)
  assert.equal(sum.consistency.length, 14)
  assert.equal(sum.consistency.at(-1)?.date, '2026-08-28')
})

test("máximo 7 sugerencias", () => {
  const s = state({
    tasks: [
      task({ daysRolled: 9, scheduledDate: '2026-08-28' }),
      task({ daysRolled: 3, scheduledDate: '2026-08-28' }),
      task({ projectId: 'a', createdDate: '2026-01-01' }),
      task({ projectId: 'b', createdDate: '2026-01-01' })
    ],
    streak: { current: 10, best: 10, lastCountedDate: '2026-08-27', freezesAvailable: 3 },
    projects: [proj('a', 'A'), proj('b', 'B')]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.ok(sum.suggestions.length <= 7)
})

// ---- análisis ampliado ----

const done = (over: Parameters<typeof task>[0]) =>
  task({ done: true, scheduledDate: '2026-08-20', ...over })

test('por proyecto: ranking por tareas y por tiempo, con porcentajes', () => {
  const s = state({
    projects: [proj('a', 'Tinkko'), proj('b', 'Planner')],
    tasks: [
      done({ projectId: 'a', completedDate: '2026-08-26T10:00:00', timeSpentMs: 30 * 60_000 }),
      done({ projectId: 'a', completedDate: '2026-08-27T10:00:00', timeSpentMs: 30 * 60_000 }),
      done({ projectId: 'b', completedDate: '2026-08-27T11:00:00', timeSpentMs: 180 * 60_000 }),
      done({ projectId: null, completedDate: '2026-08-28T09:00:00' })
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.deepEqual(sum.byProject.map((p) => p.name), ['Tinkko', 'Planner', 'Sin proyecto'], 'ordena por tareas')
  const a = sum.byProject.find((p) => p.id === 'a')!
  const b = sum.byProject.find((p) => p.id === 'b')!
  assert.equal(a.tasks, 2)
  assert.equal(a.taskShare, 0.5)
  assert.equal(b.timeMs, 180 * 60_000)
  assert.equal(Math.round(b.timeShare * 100), 75, 'Planner se llevó el 75% del tiempo')
  assert.equal(b.avgMs, 180 * 60_000)
  assert.ok(sum.suggestions.some((x) => x.text.includes('Planner') && x.text.includes('75%')))
  assert.ok(
    sum.suggestions.some((x) => x.text.includes('Tinkko') && x.text.includes('más tareas')),
    'avisa que otro proyecto tuvo más tareas pero menos tiempo'
  )
})

test('compara contra el período anterior de la misma duración', () => {
  const s = state({
    tasks: [
      // semana actual (22-28 ago): 3
      done({ completedDate: '2026-08-23T10:00:00', timeSpentMs: 60_000 }),
      done({ completedDate: '2026-08-24T10:00:00' }),
      done({ completedDate: '2026-08-25T10:00:00' }),
      // semana anterior (15-21 ago): 2
      done({ completedDate: '2026-08-16T10:00:00', timeSpentMs: 60_000 }),
      done({ completedDate: '2026-08-17T10:00:00' })
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.equal(sum.completed.value, 3)
  assert.equal(sum.completed.prev, 2)
  assert.equal(sum.timeMs.prev, 60_000)
  assert.ok(sum.suggestions.some((x) => x.text.includes('50% más tareas')))
})

test('"Todo" abarca desde la primera tarea cerrada y no tiene período anterior', () => {
  const s = state({
    tasks: [
      done({ completedDate: '2026-08-20T10:00:00' }),
      done({ completedDate: '2026-08-28T10:00:00' })
    ]
  })
  const sum = buildSummary(s, 'all', NOW)
  assert.equal(sum.days, 9)
  assert.equal(sum.completed.value, 2)
  assert.equal(sum.completed.prev, null)
})

test('serie diaria, día de la semana y momento del día', () => {
  const s = state({
    tasks: [
      done({ completedDate: '2026-08-26T08:00:00', timeSpentMs: 10 * 60_000 }), // miércoles, mañana
      done({ completedDate: '2026-08-26T15:00:00' }), // miércoles, tarde
      done({ completedDate: '2026-08-26T16:30:00' }), // miércoles, tarde
      done({ completedDate: '2026-08-28T21:00:00' }) // viernes, noche
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.equal(sum.daily.length, 7)
  assert.equal(sum.daily.at(-1)!.date, '2026-08-28')
  assert.equal(sum.daily.find((d) => d.date === '2026-08-26')!.count, 3)
  assert.equal(sum.daily.find((d) => d.date === '2026-08-26')!.timeMs, 10 * 60_000)
  assert.equal(sum.weekday[2].count, 3, 'miércoles')
  assert.equal(sum.weekday[4].count, 1, 'viernes')
  assert.deepEqual(sum.dayparts.map((d) => d.count), [0, 1, 2, 1])
  assert.equal(sum.activeDays, 2)
})

test('el día de cierre se toma en hora local (no UTC)', () => {
  // 9:30 pm locales del 28 ago: en UTC ya sería 29 ago en Colombia.
  const iso = new Date(2026, 7, 28, 21, 30).toISOString()
  const s = state({ tasks: [done({ completedDate: iso })] })
  const sum = buildSummary(s, 'today', NOW)
  assert.equal(sum.completed.value, 1)
})

test('las tareas que más tiempo llevaron, de mayor a menor', () => {
  const s = state({
    tasks: [
      done({ text: 'corta', completedDate: '2026-08-27T10:00:00', timeSpentMs: 5 * 60_000 }),
      done({ text: 'larga', completedDate: '2026-08-27T11:00:00', timeSpentMs: 95 * 60_000 }),
      done({ text: 'media', completedDate: '2026-08-27T12:00:00', timeSpentMs: 30 * 60_000 }),
      done({ text: 'sin tiempo', completedDate: '2026-08-27T13:00:00' })
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.deepEqual(sum.longest.map((t) => t.text), ['larga', 'media', 'corta'])
  assert.ok(sum.suggestions.some((x) => x.text.includes('larga') && x.text.includes('1 h')))
})

test('pendientes: Hoy, sueltas, con día y atascadas', () => {
  const s = state({
    tasks: [
      task({ text: 'rueda', scheduledDate: '2026-08-28', daysRolled: 4 }),
      task({ scheduledDate: '2026-08-28' }),
      task({ scheduledDate: null }),
      task({ scheduledDate: null }),
      task({ scheduledDate: '2026-09-02' })
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.deepEqual(sum.backlog, { today: 2, loose: 2, planned: 1 })
  assert.equal(sum.stuck[0].text, 'rueda')
  assert.equal(sum.stuck[0].daysRolled, 4)
})

test('avisos: cronómetro poco usado y muchas tareas sin día', () => {
  const s = state({
    tasks: [
      ...[1, 2, 3, 4, 5].map((i) => done({ completedDate: `2026-08-2${i}T10:00:00` })),
      ...Array.from({ length: 8 }, () => task({ scheduledDate: null }))
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.ok(sum.suggestions.some((x) => x.text.includes('tiempo medido')))
  assert.ok(sum.suggestions.some((x) => x.text.includes('8 tareas sin día')))
})

test('un período sin datos no revienta', () => {
  const sum = buildSummary(state(), 'month', NOW)
  assert.equal(sum.completed.value, 0)
  assert.equal(sum.byProject.length, 0)
  assert.equal(sum.avgTaskMs, null)
  assert.equal(sum.daily.length, 30)
  assert.ok(sum.suggestions.length >= 1)
})
