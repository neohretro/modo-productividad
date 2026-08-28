import { test } from 'vitest'
import assert from 'node:assert/strict'
import { INITIAL_STATE, type PersistedState, type Task } from '@shared/types'
import { buildWeek, canAddOn, targetForDay, weekOf } from '@shared/calendar'

const NOW = new Date('2026-08-28T12:00:00') // viernes

function task(over: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    text: 't',
    done: false,
    projectId: 'today',
    createdDate: '2026-08-28',
    completedDate: null,
    daysRolled: 0,
    timeSpentMs: 0,
    focusStartedAt: null,
    scheduledDate: null,
    ...over
  }
}

function state(over: Partial<PersistedState> = {}): PersistedState {
  return { ...structuredClone(INITIAL_STATE), ...over }
}

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
    todayTasks: [task({ text: 'hoy-1' }), task({ text: 'hoy-2', done: true, completedDate: '2026-08-28T10:00:00' })],
    scheduledTasks: [task({ text: 'futura', scheduledDate: '2026-08-30' })],
    archivedTasks: [task({ text: 'ayer', done: true, completedDate: '2026-08-27T09:00:00' })]
  })
  const cols = buildWeek(s, weekOf('2026-08-28'), NOW)

  const jue = cols.find((c) => c.iso === '2026-08-27')!
  assert.deepEqual(jue.tasks.map((t) => t.text), ['ayer'])
  assert.equal(jue.isPast, true)

  const vie = cols.find((c) => c.iso === '2026-08-28')!
  assert.equal(vie.isToday, true)
  assert.equal(vie.tasks.length, 2)
  assert.equal(vie.doneCount, 1)

  const dom = cols.find((c) => c.iso === '2026-08-30')!
  assert.deepEqual(dom.tasks.map((t) => t.text), ['futura'])
})

test('buildWeek deduplica por id', () => {
  const t = task({ text: 'dup', done: true, completedDate: '2026-08-27T09:00:00' })
  const s = state({ todayTasks: [t], archivedTasks: [t] })
  const jue = buildWeek(s, weekOf('2026-08-28'), NOW).find((c) => c.iso === '2026-08-27')!
  assert.equal(jue.tasks.length, 1)
})

test('canAddOn: hoy y futuro sí, pasado no', () => {
  assert.equal(canAddOn('2026-08-28', NOW), true)
  assert.equal(canAddOn('2026-08-30', NOW), true)
  assert.equal(canAddOn('2026-08-27', NOW), false)
})

test('targetForDay: hoy/pasado → sin fecha, futuro → programada', () => {
  assert.deepEqual(targetForDay('2026-08-28', NOW), { projectId: 'today', date: null })
  assert.deepEqual(targetForDay('2026-08-30', NOW), { projectId: 'today', date: '2026-08-30' })
})
