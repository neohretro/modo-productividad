import { test } from 'vitest'
import assert from 'node:assert/strict'
import { INITIAL_STATE, TODAY_PROJECT_ID, type PersistedState, type Task } from '@shared/types'
import { buildSummary } from '@shared/insights'

const NOW = new Date('2026-08-28T12:00:00')

function task(over: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    text: 't',
    done: false,
    projectId: TODAY_PROJECT_ID,
    createdDate: '2026-08-28',
    completedDate: null,
    daysRolled: 0,
    timeSpentMs: 0,
    focusStartedAt: null,
    ...over
  }
}

function state(over: Partial<PersistedState> = {}): PersistedState {
  return { ...structuredClone(INITIAL_STATE), ...over }
}

test('cuenta completadas del período y agrupa por proyecto', () => {
  const s = state({
    todayTasks: [
      task({ done: true, completedDate: '2026-08-28T10:00:00', timeSpentMs: 600_000 }),
      task({ done: true, completedDate: '2026-08-27T10:00:00' }),
      task({ done: false })
    ],
    projects: [
      {
        id: 'p1',
        name: 'Planner',
        createdDate: '2026-08-01',
        tasks: [task({ projectId: 'p1', done: true, completedDate: '2026-08-28T09:00:00' })]
      }
    ]
  })

  const today = buildSummary(s, 'today', NOW)
  assert.equal(today.completedCount, 2)
  assert.equal(today.totalTimeMs, 600_000)
  assert.equal(today.trackedCount, 1)
  assert.deepEqual(
    today.worked.map((g) => g.projectName).sort(),
    ['Hoy (suelto)', 'Planner']
  )

  const week = buildSummary(s, 'week', NOW)
  assert.equal(week.completedCount, 3)
})

test('sugerencia: tarea que lleva días rodando', () => {
  const s = state({
    todayTasks: [task({ text: 'Guion largo', daysRolled: 4 })]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.ok(sum.suggestions.some((x) => x.tone === 'nudge' && x.text.includes('4 días')))
})

test('sugerencia: proyecto sin movimiento', () => {
  const s = state({
    projects: [
      {
        id: 'p1',
        name: 'Gear',
        createdDate: '2026-08-01',
        tasks: [task({ projectId: 'p1', createdDate: '2026-08-15' })]
      }
    ]
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

test('máximo 5 sugerencias', () => {
  const s = state({
    todayTasks: [task({ daysRolled: 9 }), task({ daysRolled: 3 })],
    streak: { current: 10, best: 10, lastCountedDate: '2026-08-27', freezesAvailable: 3 },
    projects: [
      { id: 'a', name: 'A', createdDate: '2026-01-01', tasks: [task({ projectId: 'a', createdDate: '2026-01-01' })] },
      { id: 'b', name: 'B', createdDate: '2026-01-01', tasks: [task({ projectId: 'b', createdDate: '2026-01-01' })] }
    ]
  })
  const sum = buildSummary(s, 'week', NOW)
  assert.ok(sum.suggestions.length <= 5)
})
