import { test } from 'vitest'
import assert from 'node:assert/strict'
import type { PersistedState } from '@shared/types'
import {
  activeFocusTasks,
  commitFocus,
  elapsedMs,
  focusPhase,
  focusSortRank,
  formatDuration,
  normalizeState,
  STALE_FOCUS_MS
} from '@shared/focus'
import { state, task } from './helpers'

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

test('normalizeState rellena campos de un estado nuevo incompleto', () => {
  const partial = {
    version: 5,
    tasks: [{ id: 'a', text: 'x', done: false, projectId: 'p', scheduledDate: '2026-09-01' }]
  } as unknown as Partial<PersistedState>

  const out = normalizeState(partial, 1_000_000)
  assert.equal(out.version, 5)
  assert.equal(out.tasks[0].projectId, 'p')
  assert.equal(out.tasks[0].scheduledDate, '2026-09-01')
  assert.equal(out.tasks[0].timeSpentMs, 0)
  assert.equal(out.tasks[0].focusStartedAt, null)
  assert.equal(out.tasks[0].lastFocusedDate, null)
  assert.equal(out.settings.multitaskNudges, true)
})

test('normalizeState cierra enfoques colgados de sesiones viejas', () => {
  const now = 10_000_000
  const out = normalizeState(
    state({
      tasks: [
        task({ focusStartedAt: now - (STALE_FOCUS_MS + 5) }),
        task({ focusStartedAt: now - 60_000 })
      ]
    }),
    now
  )
  assert.equal(out.tasks[0].focusStartedAt, null, 'el viejo se cierra')
  assert.equal(out.tasks[1].focusStartedAt, now - 60_000, 'el reciente sigue')
})

test('activeFocusTasks ignora completadas y sin enfoque', () => {
  const s = state({
    tasks: [
      task({ focusStartedAt: 1 }),
      task({ focusStartedAt: 2, done: true }),
      task({ focusStartedAt: null }),
      task({ focusStartedAt: 3, projectId: 'p' })
    ]
  })
  assert.equal(activeFocusTasks(s).length, 2)
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
