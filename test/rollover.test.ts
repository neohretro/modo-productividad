import { test } from 'vitest'
import assert from 'node:assert/strict'
import { rolloverIfNeeded } from '@shared/rollover'
import { state, task } from './helpers'

/** Tarea asignada al día que cierra (27 ago) → está en la lista de ese día. */
const inDay = (over: Parameters<typeof task>[0] = {}) =>
  task({ scheduledDate: '2026-08-27', ...over })

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
    tasks: [inDay({ done: true }), inDay({ done: true }), inDay({ done: false, daysRolled: 1 })]
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.tasks.length, 1)
  assert.equal(out.tasks[0].daysRolled, 2)
  assert.equal(out.tasks[0].scheduledDate, '2026-08-28', 'la pendiente pasa a ser de hoy')
  assert.equal(out.archivedTasks.length, 2)
  assert.deepEqual(out.snapshots[0], {
    date: '2026-08-27',
    totalTasks: 3,
    completedTasks: 2,
    completionRate: 2 / 3,
    tasksCarriedOver: 1
  })
})

test('las tareas sueltas y las de días futuros NO entran en el cierre ni ruedan', () => {
  const loose = task({ projectId: 'p1', scheduledDate: null })
  const future = task({ scheduledDate: '2026-09-02' })
  const s = state({
    lastRolloverDate: '2026-08-27',
    tasks: [inDay({ done: true }), loose, future]
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.snapshots[0].totalTasks, 1, 'solo cuenta la lista del día')
  assert.equal(out.tasks.length, 2)
  const looseAfter = out.tasks.find((t) => t.id === loose.id)!
  assert.equal(looseAfter.scheduledDate, null)
  assert.equal(looseAfter.daysRolled, 0)
  assert.equal(out.tasks.find((t) => t.id === future.id)!.scheduledDate, '2026-09-02')
})

test('una tarea completada sin día se archiva al cerrar el día', () => {
  const doneLoose = task({ done: true, completedDate: '2026-08-27T10:00:00', projectId: 'p1' })
  const out = rolloverIfNeeded(
    state({ lastRolloverDate: '2026-08-27', tasks: [doneLoose, inDay()] }),
    new Date('2026-08-28T08:00:00')
  )
  assert.equal(out.archivedTasks.length, 1)
  assert.equal(out.archivedTasks[0].id, doneLoose.id)
  assert.equal(out.archivedTasks[0].projectId, 'p1', 'conserva su etiqueta de proyecto')
})

test('racha: día ganado incrementa', () => {
  const s = state({
    lastRolloverDate: '2026-08-27',
    tasks: [inDay({ done: true }), inDay({ done: true })],
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
    tasks: [inDay({ done: true }), inDay({ done: false })],
    streak: { current: 8, best: 10, lastCountedDate: '2026-08-26', freezesAvailable: 2 }
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.streak.current, 8, 'la racha se mantiene')
  assert.equal(out.streak.freezesAvailable, 1, 'se consume un freeze')
})

test('racha: día fallado sin freeze => se rompe', () => {
  const s = state({
    lastRolloverDate: '2026-08-27',
    tasks: [inDay({ done: false })],
    streak: { current: 3, best: 5, lastCountedDate: '2026-08-26', freezesAvailable: 0 }
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  assert.equal(out.streak.current, 0)
})

test('hueco de varios días => racha rota y snapshots vacíos de relleno', () => {
  const s = state({
    lastRolloverDate: '2026-08-25',
    tasks: [task({ done: true, scheduledDate: '2026-08-25' })],
    streak: { current: 9, best: 9, lastCountedDate: '2026-08-24', freezesAvailable: 3 }
  })
  const out = rolloverIfNeeded(s, new Date('2026-08-28T08:00:00'))
  // cierra el 25 + rellena 26 y 27
  assert.equal(out.snapshots.length, 3)
  assert.equal(out.streak.current, 1, 'día ganado tras el hueco reinicia a 1')
  assert.equal(out.tasks.length, 0, 'la completada se archiva, no rueda')
  assert.equal(out.archivedTasks.length, 1)
})
