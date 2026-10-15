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

test('máximo 5 sugerencias', () => {
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
  assert.ok(sum.suggestions.length <= 5)
})
