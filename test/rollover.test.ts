import { test } from 'vitest'
import assert from 'node:assert/strict'
import { INITIAL_STATE, type PersistedState, type Task } from '@shared/types'
import { rolloverIfNeeded } from '@shared/rollover'

function task(over: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    text: 't',
    done: false,
    projectId: 'today',
    createdDate: '2026-08-27',
    completedDate: null,
    daysRolled: 0,
    ...over
  }
}

function state(over: Partial<PersistedState> = {}): PersistedState {
  return { ...structuredClone(INITIAL_STATE), ...over }
}

test('primera ejecución: solo fija lastRolloverDate, sin snapshot', () => {
  const s = rolloverIfNeeded(state({ lastRolloverDate: null }), new Date('2026-08-28T09:00:00'))
  assert.equal(s.lastRolloverDate, '2026-08-28')
  assert.equal(s.snapshots.length, 0)
})

test('mismo día: no-op', () => {
  const before = state({ lastRolloverDate: '2026-08-28' })
  const after = rolloverIfNeeded(before, new Date('2026-08-28T23:00:00'))
  assert.equal(after, before)
})

test('cierre de día: archiva completadas, hace rodar pendientes, snapshot correcto', () => {
  const s = state({
    lastRolloverDate: '2026-08-27',
    todayTasks: [
      task({ done: true }),
      task({ done: true }),
      task({ done: false, daysRolled: 1 })
    ]
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.todayTasks.length, 1)
  assert.equal(out.todayTasks[0].daysRolled, 2)
  assert.equal(out.archivedTasks.length, 2)
  assert.deepEqual(out.snapshots[0], {
    date: '2026-08-27',
    totalTasks: 3,
    completedTasks: 2,
    completionRate: 2 / 3,
    tasksCarriedOver: 1
  })
})

test('racha: día ganado incrementa', () => {
  const s = state({
    lastRolloverDate: '2026-08-27',
    todayTasks: [task({ done: true }), task({ done: true })],
    streak: { current: 4, best: 4, lastCountedDate: '2026-08-26', freezesAvailable: 0 }
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.streak.current, 5)
  assert.equal(out.streak.best, 5)
  assert.equal(out.streak.freezesAvailable, 1, 'gana un freeze a los 5 días')
})

test('racha: día fallado con freeze disponible => se protege', () => {
  const s = state({
    lastRolloverDate: '2026-08-27',
    todayTasks: [task({ done: true }), task({ done: false })],
    streak: { current: 8, best: 10, lastCountedDate: '2026-08-26', freezesAvailable: 2 }
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.streak.current, 8, 'la racha se mantiene')
  assert.equal(out.streak.freezesAvailable, 1, 'se consume un freeze')
})

test('racha: día fallado sin freeze => se rompe', () => {
  const s = state({
    lastRolloverDate: '2026-08-27',
    todayTasks: [task({ done: false })],
    streak: { current: 3, best: 5, lastCountedDate: '2026-08-26', freezesAvailable: 0 }
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.streak.current, 0)
})

test('hueco de varios días => racha rota y snapshots vacíos de relleno', () => {
  const s = state({
    lastRolloverDate: '2026-08-25',
    todayTasks: [task({ done: true })],
    streak: { current: 9, best: 9, lastCountedDate: '2026-08-24', freezesAvailable: 3 }
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  // cierra el 25 + rellena 26 y 27
  assert.equal(out.snapshots.length, 3)
  assert.equal(out.streak.current, 1, 'día ganado tras el hueco reinicia a 1')
  assert.equal(out.todayTasks.length, 0, 'la completada se archiva, no rueda')
  assert.equal(out.archivedTasks.length, 1)
})
