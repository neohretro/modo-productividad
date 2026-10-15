import { test } from 'vitest'
import assert from 'node:assert/strict'
import { buildWeek, canAddOn, weekOf } from '@shared/calendar'
import { state, task } from './helpers'

const NOW = new Date('2026-08-28T12:00:00') // viernes

test('weekOf devuelve lunes→domingo de la semana que contiene la fecha', () => {
  const w = weekOf('2026-08-28')
  assert.deepEqual(w, [
    '2026-08-24',
    '2026-08-25',
    '2026-08-26',
    '2026-08-27',
    '2026-08-28',
    '2026-08-29',
    '2026-08-30'
  ])
})

test('weekOf es estable si el ancla ya es lunes', () => {
  assert.equal(weekOf('2026-08-24')[0], '2026-08-24')
})

test('buildWeek reparte hoy / pasado / futuro', () => {
  const s = state({
    tasks: [
      task({ text: 'hoy-1', scheduledDate: '2026-08-28' }),
      task({ text: 'hoy-2', scheduledDate: '2026-08-28', done: true, completedDate: '2026-08-28T10:00:00' }),
      task({ text: 'atrasada', scheduledDate: '2026-08-26' }),
      task({ text: 'futura', scheduledDate: '2026-08-30' }),
      task({ text: 'suelta', scheduledDate: null, projectId: 'p1' })
    ],
    archivedTasks: [task({ text: 'ayer', done: true, completedDate: '2026-08-27T09:00:00' })]
  })
  const cols = buildWeek(s, weekOf('2026-08-28'), NOW)

  const jue = cols.find((c) => c.iso === '2026-08-27')!
  assert.deepEqual(jue.tasks.map((t) => t.text), ['ayer'])
  assert.equal(jue.isPast, true)

  const vie = cols.find((c) => c.iso === '2026-08-28')!
  assert.equal(vie.isToday, true)
  assert.deepEqual(vie.tasks.map((t) => t.text), ['hoy-1', 'hoy-2', 'atrasada'])
  assert.equal(vie.doneCount, 1)

  const dom = cols.find((c) => c.iso === '2026-08-30')!
  assert.deepEqual(dom.tasks.map((t) => t.text), ['futura'])

  const todos = cols.flatMap((c) => c.tasks.map((t) => t.text))
  assert.ok(!todos.includes('suelta'), 'las sueltas no aparecen en ningún día')
})

test('buildWeek deduplica por id', () => {
  const t = task({ text: 'dup', done: true, completedDate: '2026-08-27T09:00:00' })
  const s = state({ tasks: [t], archivedTasks: [t] })
  const jue = buildWeek(s, weekOf('2026-08-28'), NOW).find((c) => c.iso === '2026-08-27')!
  assert.equal(jue.tasks.length, 1)
})

test('canAddOn: hoy y futuro sí, pasado no', () => {
  assert.equal(canAddOn('2026-08-28', NOW), true)
  assert.equal(canAddOn('2026-08-30', NOW), true)
  assert.equal(canAddOn('2026-08-27', NOW), false)
})
