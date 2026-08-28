import { test } from 'vitest'
import assert from 'node:assert/strict'
import { INITIAL_STATE, type PersistedState, type Task } from '@shared/types'
import { activateDue, scheduleLabel } from '@shared/schedule'

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
    ...over
  }
}

function state(over: Partial<PersistedState> = {}): PersistedState {
  return { ...structuredClone(INITIAL_STATE), ...over }
}

test('activateDue mueve a Hoy las tareas cuyo día llegó', () => {
  const s = state({
    todayTasks: [task({ text: 'ya' })],
    scheduledTasks: [
      task({ text: 'ayer', scheduledDate: '2026-08-27' }),
      task({ text: 'hoy', scheduledDate: '2026-08-28' }),
      task({ text: 'mañana', scheduledDate: '2026-08-29' })
    ]
  })
  const out = activateDue(s, NOW)
  assert.equal(out.todayTasks.length, 3)
  assert.equal(out.scheduledTasks.length, 1)
  assert.equal(out.scheduledTasks[0].text, 'mañana')
  assert.equal(out.todayTasks.find((t) => t.text === 'hoy')?.scheduledDate, null)
})

test('activateDue es no-op si nada vence', () => {
  const s = state({ scheduledTasks: [task({ scheduledDate: '2026-09-15' })] })
  assert.equal(activateDue(s, NOW), s)
})

test('scheduleLabel', () => {
  assert.equal(scheduleLabel('2026-08-29', NOW), 'mañana')
  assert.equal(scheduleLabel('2026-08-31', NOW), 'lunes')
  assert.match(scheduleLabel('2026-09-20', NOW), /sept/)
})
