import { test } from 'vitest'
import assert from 'node:assert/strict'
import {
  computeGame,
  dayMessage,
  levelFromXp,
  rewardBetween,
  xpForLevel,
  xpForTask
} from '@shared/game'
import { state, task } from './helpers'

const NOW = new Date('2026-08-28T12:00:00')
const doneOn = (day: string, over: Parameters<typeof task>[0] = {}) =>
  task({ done: true, completedDate: `${day}T10:00:00`, scheduledDate: day, ...over })

test('XP por tarea: base + tiempo + "al fin"', () => {
  assert.equal(xpForTask(task()), 0, 'una pendiente no da XP')
  assert.equal(xpForTask(task({ done: true })), 10)
  assert.equal(xpForTask(task({ done: true, timeSpentMs: 35 * 60_000 })), 13, '+1 por cada 10 min')
  assert.equal(xpForTask(task({ done: true, timeSpentMs: 10 * 3_600_000 })), 20, 'el tiempo suma máximo +10')
  assert.equal(xpForTask(task({ done: true, daysRolled: 4 })), 20, '+10 si llevaba 3+ días')
})

test('niveles: umbrales crecientes y nivel desde el XP', () => {
  assert.equal(xpForLevel(1), 0)
  assert.equal(xpForLevel(2), 80)
  assert.equal(xpForLevel(3), 240)
  assert.equal(levelFromXp(0), 1)
  assert.equal(levelFromXp(79), 1)
  assert.equal(levelFromXp(80), 2)
  assert.equal(levelFromXp(240), 3)
})

test('computeGame: XP, nivel y barra de progreso', () => {
  const s = state({ archivedTasks: Array.from({ length: 9 }, () => doneOn('2026-08-27')) })
  const g = computeGame(s, NOW)
  assert.equal(g.xp, 90)
  assert.equal(g.level, 2)
  assert.equal(g.title, 'Aprendiz')
  assert.equal(g.xpInLevel, 10)
  assert.equal(g.xpSpan, 160)
  assert.equal(g.totalTasks, 9)
})

test('días seguidos: cuenta hacia atrás y avisa si la racha está en juego', () => {
  const s = state({
    archivedTasks: [doneOn('2026-08-25'), doneOn('2026-08-26'), doneOn('2026-08-27')]
  })
  const g = computeGame(s, NOW) // hoy (28) aún sin tareas cerradas
  assert.equal(g.streakDays, 3)
  assert.equal(g.streakAtRisk, true)

  const s2 = state({
    archivedTasks: [doneOn('2026-08-26'), doneOn('2026-08-27')],
    tasks: [doneOn('2026-08-28'), task({ scheduledDate: '2026-08-28' })]
  })
  const g2 = computeGame(s2, NOW)
  assert.equal(g2.streakDays, 3)
  assert.equal(g2.streakAtRisk, false)
  assert.equal(g2.doneToday, 1)
})

test('días seguidos: un hueco corta la racha actual pero conserva la mejor', () => {
  const s = state({
    archivedTasks: [
      doneOn('2026-08-10'),
      doneOn('2026-08-11'),
      doneOn('2026-08-12'),
      doneOn('2026-08-13'),
      doneOn('2026-08-27')
    ]
  })
  const g = computeGame(s, NOW)
  assert.equal(g.streakDays, 1)
  assert.equal(g.bestStreak, 4)
})

test('día perfecto: da bonus y se cuenta (pasado por el cierre, y hoy si ya está todo)', () => {
  const s = state({
    snapshots: [
      { date: '2026-08-26', totalTasks: 3, completedTasks: 3, completionRate: 1, tasksCarriedOver: 0 },
      { date: '2026-08-27', totalTasks: 3, completedTasks: 2, completionRate: 2 / 3, tasksCarriedOver: 1 },
      { date: '2026-08-25', totalTasks: 1, completedTasks: 1, completionRate: 1, tasksCarriedOver: 0 }
    ],
    tasks: [doneOn('2026-08-28'), doneOn('2026-08-28')]
  })
  const g = computeGame(s, NOW)
  assert.equal(g.perfectDays, 2, 'el 26 y hoy (el del 25 tenía 1 sola tarea)')
  assert.equal(g.perfectToday, true)
  assert.equal(g.xp, 2 * 10 + 2 * 25)
})

test('logros: se desbloquean con los datos y muestran su progreso', () => {
  const s = state({
    projects: [
      { id: 'a', name: 'A', createdDate: '2026-08-01' },
      { id: 'b', name: 'B', createdDate: '2026-08-01' },
      { id: 'c', name: 'C', createdDate: '2026-08-01' }
    ],
    archivedTasks: [
      ...['a', 'b', 'c'].map((p) => doneOn('2026-08-27', { projectId: p })),
      task({ done: true, completedDate: new Date(2026, 7, 27, 6, 0).toISOString(), daysRolled: 6 })
    ]
  })
  const g = computeGame(s, NOW)
  const by = (id: string) => g.achievements.find((a) => a.id === id)!
  assert.equal(by('first').unlocked, true)
  assert.equal(by('projects3').unlocked, true)
  assert.equal(by('rescue').unlocked, true)
  assert.equal(by('early').unlocked, true)
  assert.equal(by('t10').unlocked, false)
  assert.equal(by('t10').value, 4)
  assert.equal(by('t10').target, 10)
})

test('recompensa: XP ganado, subida de nivel y logros nuevos (una sola vez)', () => {
  const before = computeGame(state({ archivedTasks: Array.from({ length: 7 }, () => doneOn('2026-08-27')) }), NOW)
  const after = computeGame(state({ archivedTasks: Array.from({ length: 8 }, () => doneOn('2026-08-27')) }), NOW)
  const r = rewardBetween(before, after, ['first'])!
  assert.equal(r.xp, 10)
  assert.deepEqual(r.levelUp, { level: 2, title: 'Aprendiz' })

  const seenAll = after.achievements.filter((a) => a.unlocked).map((a) => a.id)
  const again = rewardBetween(after, after, seenAll)
  assert.equal(again, null, 'sin cambios no hay recompensa')

  const first = rewardBetween(
    computeGame(state(), NOW),
    computeGame(state({ tasks: [doneOn('2026-08-28'), task({ scheduledDate: '2026-08-28' })] }), NOW),
    []
  )!
  assert.ok(first.achievements.some((a) => a.id === 'first'))
})

test('mensaje del día', () => {
  const g = computeGame(state(), NOW)
  assert.match(dayMessage(g, 0, 0), /primera tarea/)
  assert.match(dayMessage(g, 3, 5), /Te faltan 3/)
  assert.match(dayMessage(g, 1, 5), /Te falta 1/)
  assert.match(dayMessage(g, 0, 5), /Todo hecho/)
})
