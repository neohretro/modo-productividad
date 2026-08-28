import { test } from 'vitest'
import assert from 'node:assert/strict'
import { INITIAL_STATE, type PersistedState, type Task } from '@shared/types'
import {
  clearRemindAts,
  collectReminders,
  inHoursISO,
  laterTodayISO,
  tomorrowAtISO
} from '@shared/reminders'

const NOW = new Date('2026-08-28T12:00:00')

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
    remindAt: null,
    ...over
  }
}

function state(over: Partial<PersistedState> = {}): PersistedState {
  return { ...structuredClone(INITIAL_STATE), ...over }
}

test('collectReminders separa vencidos (con gracia) de futuros e ignora antiguos', () => {
  const s = state({
    todayTasks: [
      task({ id: 'a', text: 'futura', remindAt: '2026-08-28T15:00:00' }),
      task({ id: 'b', text: 'recien vencida', remindAt: '2026-08-28T11:00:00' }),
      task({ id: 'c', text: 'muy vieja', remindAt: '2026-08-26T09:00:00' }),
      task({ id: 'd', text: 'hecha', done: true, remindAt: '2026-08-28T15:00:00' }),
      task({ id: 'e', text: 'sin recordatorio' })
    ]
  })
  const { due, upcoming } = collectReminders(s, NOW.getTime())
  assert.deepEqual(
    due.map((r) => r.id),
    ['b']
  )
  assert.deepEqual(
    upcoming.map((r) => r.id),
    ['a']
  )
})

test('collectReminders incluye tareas de proyecto y ordena las futuras', () => {
  const s = state({
    projects: [
      {
        id: 'p',
        name: 'P',
        createdDate: '2026-08-01',
        tasks: [
          task({ id: 'late', remindAt: '2026-08-29T10:00:00' }),
          task({ id: 'soon', remindAt: '2026-08-28T13:00:00' })
        ]
      }
    ]
  })
  const { upcoming } = collectReminders(s, NOW.getTime())
  assert.deepEqual(
    upcoming.map((r) => r.id),
    ['soon', 'late']
  )
})

test('clearRemindAts limpia solo las tareas indicadas, en cualquier lista', () => {
  const s = state({
    todayTasks: [task({ id: 'a', remindAt: '2026-08-28T15:00:00' })],
    scheduledTasks: [task({ id: 'b', remindAt: '2026-08-30T15:00:00', scheduledDate: '2026-08-30' })],
    projects: [
      { id: 'p', name: 'P', createdDate: '2026-08-01', tasks: [task({ id: 'c', remindAt: '2026-08-28T16:00:00' })] }
    ]
  })
  const out = clearRemindAts(s, new Set(['a', 'c']))
  assert.equal(out.todayTasks[0].remindAt, null)
  assert.equal(out.scheduledTasks[0].remindAt, '2026-08-30T15:00:00')
  assert.equal(out.projects[0].tasks[0].remindAt, null)
})

test('presets de hora', () => {
  assert.equal(inHoursISO(1, NOW), new Date('2026-08-28T13:00:00').toISOString())
  assert.equal(laterTodayISO(18, NOW), new Date('2026-08-28T18:00:00').toISOString())
  assert.equal(laterTodayISO(9, NOW), null, 'las 9:00 ya pasaron')
  assert.equal(tomorrowAtISO(9, NOW), new Date('2026-08-29T09:00:00').toISOString())
})
