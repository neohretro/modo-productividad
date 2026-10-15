import { test } from 'vitest'
import assert from 'node:assert/strict'
import { clearRemindAts, collectReminders, inHoursISO, laterTodayISO, tomorrowAtISO } from '@shared/reminders'
import { state, task } from './helpers'

const NOW = new Date('2026-08-28T12:00:00')

test('collectReminders separa vencidos (con gracia) de futuros e ignora antiguos', () => {
  const s = state({
    tasks: [
      task({ id: 'a', text: 'futura', remindAt: '2026-08-28T15:00:00' }),
      task({ id: 'b', text: 'recien vencida', remindAt: '2026-08-28T11:00:00' }),
      task({ id: 'c', text: 'muy vieja', remindAt: '2026-08-26T09:00:00' }),
      task({ id: 'd', text: 'hecha', done: true, remindAt: '2026-08-28T15:00:00' }),
      task({ id: 'e', text: 'sin recordatorio' })
    ]
  })
  const { due, upcoming } = collectReminders(s, NOW.getTime())
  assert.deepEqual(due.map((r) => r.id), ['b'])
  assert.deepEqual(upcoming.map((r) => r.id), ['a'])
})

test('collectReminders incluye tareas con etiqueta, sin día o con día, y ordena las futuras', () => {
  const s = state({
    tasks: [
      task({ id: 'late', projectId: 'p', remindAt: '2026-08-29T10:00:00' }),
      task({ id: 'soon', projectId: 'p', scheduledDate: '2026-08-28', remindAt: '2026-08-28T13:00:00' })
    ]
  })
  const { upcoming } = collectReminders(s, NOW.getTime())
  assert.deepEqual(upcoming.map((r) => r.id), ['soon', 'late'])
})

test('clearRemindAts limpia solo las tareas indicadas', () => {
  const s = state({
    tasks: [
      task({ id: 'a', remindAt: '2026-08-28T15:00:00' }),
      task({ id: 'b', remindAt: '2026-08-30T15:00:00', scheduledDate: '2026-08-30' }),
      task({ id: 'c', projectId: 'p', remindAt: '2026-08-28T16:00:00' })
    ]
  })
  const out = clearRemindAts(s, new Set(['a', 'c']))
  assert.equal(out.tasks[0].remindAt, null)
  assert.equal(out.tasks[1].remindAt, '2026-08-30T15:00:00')
  assert.equal(out.tasks[2].remindAt, null)
})

test('presets de hora', () => {
  assert.equal(inHoursISO(1, NOW), new Date('2026-08-28T13:00:00').toISOString())
  assert.equal(laterTodayISO(18, NOW), new Date('2026-08-28T18:00:00').toISOString())
  assert.equal(laterTodayISO(9, NOW), null, 'las 9:00 ya pasaron')
  assert.equal(tomorrowAtISO(9, NOW), new Date('2026-08-29T09:00:00').toISOString())
})
