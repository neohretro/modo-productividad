import { test } from 'vitest'
import assert from 'node:assert/strict'
import type { PersistedState, Task } from '@shared/types'
import { INITIAL_STATE } from '@shared/types'
import {
  activeFocusTasks,
  commitFocus,
  elapsedMs,
  focusPhase,
  focusSortRank,
  formatDuration,
  normalizeState,
  STALE_FOCUS_MS,
  todayProjectTasks
} from '@shared/focus'

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
    ...over
  }
}

test('elapsedMs suma el tramo activo', () => {
  const now = 1_000_000
  const t = task({ timeSpentMs: 5_000, focusStartedAt: now - 3_000 })
  assert.equal(elapsedMs(t, now), 8_000)
})

test('play/pausa/play acumula: el total = suma de tramos, la pausa no cuenta', () => {
  const HORA = 3_600_000
  // tramo 1: 1 hora, luego pausa
  let t = task({ focusStartedAt: 0 })
  t = commitFocus(t, HORA) // pausa a la hora
  assert.equal(t.timeSpentMs, HORA)
  assert.equal(t.focusStartedAt, null)
  // pausado 2 horas, luego play de nuevo
  t = { ...t, focusStartedAt: 3 * HORA }
  // trabaja 30 min y completa
  t = commitFocus(t, 3 * HORA + HORA / 2)
  assert.equal(t.timeSpentMs, HORA + HORA / 2, '1h + 0.5h = 1.5h; las 2h de pausa no cuentan')
})

test('commitFocus cierra el tramo y suma el tiempo', () => {
  const now = 1_000_000
  const t = task({ timeSpentMs: 1_000, focusStartedAt: now - 60_000 })
  const out = commitFocus(t, now)
  assert.equal(out.focusStartedAt, null)
  assert.equal(out.timeSpentMs, 61_000)
})

test('commitFocus descarta tramos absurdos (app cerrada)', () => {
  const now = 1_000_000
  const t = task({ timeSpentMs: 0, focusStartedAt: now - (STALE_FOCUS_MS + 1) })
  const out = commitFocus(t, now)
  assert.equal(out.timeSpentMs, 0)
  assert.equal(out.focusStartedAt, null)
})

test('formatDuration', () => {
  assert.equal(formatDuration(0), '00:00')
  assert.equal(formatDuration(65_000), '01:05')
  assert.equal(formatDuration(3_725_000), '1h 02m')
})

test('normalizeState rellena campos nuevos y sube la versión', () => {
  const legacy = {
    todayTasks: [{ id: 'a', text: 'x', done: false, projectId: 'today', createdDate: '2026-08-01' }],
    projects: [{ id: 'p', name: 'P', tasks: [{ id: 'b', text: 'y' }] }]
  } as unknown as Partial<PersistedState>

  const out = normalizeState(legacy, 1_000_000)
  assert.equal(out.version, 4)
  assert.equal(out.todayTasks[0].lastFocusedDate, null)
  assert.equal(out.todayTasks[0].timeSpentMs, 0)
  assert.equal(out.todayTasks[0].focusStartedAt, null)
  assert.equal(out.projects[0].tasks[0].timeSpentMs, 0)
  assert.equal(out.settings.multitaskNudges, true)
})

test('normalizeState cierra enfoques colgados de sesiones viejas', () => {
  const now = 10_000_000
  const s: Partial<PersistedState> = {
    todayTasks: [
      task({ focusStartedAt: now - (STALE_FOCUS_MS + 5) }),
      task({ focusStartedAt: now - 60_000 })
    ]
  }
  const out = normalizeState(s, now)
  assert.equal(out.todayTasks[0].focusStartedAt, null, 'el viejo se cierra')
  assert.equal(out.todayTasks[1].focusStartedAt, now - 60_000, 'el reciente sigue')
})

test('activeFocusTasks ignora completadas y sin enfoque', () => {
  const s: PersistedState = {
    ...INITIAL_STATE,
    todayTasks: [
      task({ focusStartedAt: 1 }),
      task({ focusStartedAt: 2, done: true }),
      task({ focusStartedAt: null })
    ],
    projects: [
      { id: 'p', name: 'P', createdDate: '2026-08-01', tasks: [task({ focusStartedAt: 3 })] }
    ]
  }
  assert.equal(activeFocusTasks(s).length, 2)
})

test('todayProjectTasks: tareas de proyecto trabajadas hoy (en curso o en pausa), no hechas', () => {
  const now = new Date('2026-08-28T15:00:00')
  const s: PersistedState = {
    ...INITIAL_STATE,
    todayTasks: [task({ focusStartedAt: 1, lastFocusedDate: '2026-08-28' })],
    projects: [
      {
        id: 'p',
        name: 'P',
        createdDate: '2026-08-01',
        tasks: [
          task({ id: 'en-curso', focusStartedAt: 5, lastFocusedDate: '2026-08-28' }),
          task({ id: 'pausada-hoy', focusStartedAt: null, timeSpentMs: 60_000, lastFocusedDate: '2026-08-28' }),
          task({ id: 'ayer', focusStartedAt: null, timeSpentMs: 60_000, lastFocusedDate: '2026-08-27' }),
          task({ id: 'nunca', focusStartedAt: null, lastFocusedDate: null }),
          task({ id: 'hecha-hoy', done: true, lastFocusedDate: '2026-08-28' })
        ]
      }
    ]
  }
  const out = todayProjectTasks(s, now)
  assert.deepEqual(new Set(out.map((t) => t.id)), new Set(['en-curso', 'pausada-hoy']))
})

test('focusSortRank: en curso < en pausa < sin empezar < hecha', () => {
  const running = task({ focusStartedAt: 1 })
  const paused = task({ focusStartedAt: null, timeSpentMs: 5000 })
  const idle = task()
  const done = task({ done: true })
  const sorted = [idle, done, paused, running].sort((a, b) => focusSortRank(a) - focusSortRank(b))
  assert.deepEqual(sorted, [running, paused, idle, done])
})

test('focusPhase: idle / running / paused', () => {
  assert.equal(focusPhase(task()), 'idle')
  assert.equal(focusPhase(task({ focusStartedAt: 123 })), 'running')
  assert.equal(focusPhase(task({ focusStartedAt: null, timeSpentMs: 5000 })), 'paused')
  assert.equal(focusPhase(task({ focusStartedAt: null, timeSpentMs: 5000, done: true })), 'idle')
  assert.equal(focusPhase(task({ focusStartedAt: null, timeSpentMs: 200 })), 'idle', 'sub-segundo no cuenta')
})
