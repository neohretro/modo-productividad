import { test } from 'vitest'
import assert from 'node:assert/strict'
import { scheduleLabel } from '@shared/schedule'
import { dayBucket, dayLabel, looseTasks, projectProgressOf, scheduledAhead, todayList } from '@shared/tasks'
import { state, task } from './helpers'

const NOW = new Date('2026-08-28T12:00:00')

test('scheduleLabel', () => {
  assert.equal(scheduleLabel('2026-08-29', NOW), 'mañana')
  assert.equal(scheduleLabel('2026-08-31', NOW), 'lunes')
  assert.match(scheduleLabel('2026-09-20', NOW), /sept/)
})

test('dayLabel: hoy / mañana / día corto / fecha', () => {
  assert.equal(dayLabel('2026-08-28', NOW), 'hoy')
  assert.equal(dayLabel('2026-08-20', NOW), 'hoy', 'un día vencido cuenta como hoy')
  assert.equal(dayLabel('2026-08-29', NOW), 'mañana')
  assert.match(dayLabel('2026-08-31', NOW), /lun/)
  assert.match(dayLabel('2026-09-20', NOW), /sept/)
})

test('vistas: Hoy, programadas (adelante) y sueltas salen de la misma lista', () => {
  const s = state({
    tasks: [
      task({ text: 'a', scheduledDate: '2026-08-28' }),
      task({ text: 'b', scheduledDate: '2026-08-25' }),
      task({ text: 'c', scheduledDate: '2026-09-02' }),
      task({ text: 'd', scheduledDate: '2026-08-30' }),
      task({ text: 'e', scheduledDate: null }),
      task({ text: 'f', scheduledDate: null, done: true })
    ]
  })
  assert.deepEqual(todayList(s, NOW).map((t) => t.text), ['a', 'b'])
  assert.deepEqual(scheduledAhead(s, NOW).map((t) => t.text), ['d', 'c'], 'ordenadas por día')
  assert.deepEqual(looseTasks(s).map((t) => t.text), ['e'], 'las hechas no cuentan como sueltas')
  assert.equal(dayBucket(s.tasks[0], NOW), 'today')
  assert.equal(dayBucket(s.tasks[2], NOW), 'future')
  assert.equal(dayBucket(s.tasks[4], NOW), 'loose')
})

test('una tarea con etiqueta aparece en Hoy Y cuenta en el avance de su proyecto', () => {
  const s = state({
    projects: [{ id: 'p1', name: 'Tinkko', createdDate: '2026-08-01' }],
    tasks: [
      task({ projectId: 'p1', scheduledDate: '2026-08-28', done: true }),
      task({ projectId: 'p1', scheduledDate: null })
    ],
    archivedTasks: [task({ projectId: 'p1', done: true })]
  })
  assert.equal(todayList(s, NOW).length, 1)
  const p = projectProgressOf(s, 'p1')
  assert.equal(p.total, 3)
  assert.equal(p.done, 2)
})
