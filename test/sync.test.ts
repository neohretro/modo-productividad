import { test } from 'vitest'
import assert from 'node:assert/strict'
import { INITIAL_STATE, type PersistedState, type Task } from '@shared/types'
import { isPristine, mergeStates, stateFingerprint } from '@shared/sync'

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
    lastFocusedDate: null,
    ...over
  }
}

function state(over: Partial<PersistedState> = {}): PersistedState {
  return { ...structuredClone(INITIAL_STATE), ...over }
}

test('isPristine: estado inicial sí, con una tarea no', () => {
  assert.equal(isPristine(state()), true)
  assert.equal(isPristine(state({ todayTasks: [task()] })), false)
  assert.equal(
    isPristine(state({ streak: { current: 2, best: 2, lastCountedDate: null, freezesAvailable: 1 } })),
    false
  )
})

test('stateFingerprint ignora cambios no sincronizables y es estable', () => {
  const a = state({ todayTasks: [task({ id: 'x', text: 'hola' })] })
  const b = state({ todayTasks: [task({ id: 'x', text: 'hola' })], version: 999 })
  assert.equal(stateFingerprint(a), stateFingerprint(b))
})

test('mergeStates: une tareas por id de ambos equipos', () => {
  const local = state({ todayTasks: [task({ id: 'a', text: 'a' })] })
  const remote = state({ todayTasks: [task({ id: 'b', text: 'b' })] })
  const out = mergeStates(local, remote)
  assert.deepEqual(new Set(out.todayTasks.map((t) => t.id)), new Set(['a', 'b']))
})

test('mergeStates: si una copia está hecha, gana la hecha', () => {
  const local = state({ todayTasks: [task({ id: 'a', done: false })] })
  const remote = state({
    todayTasks: [task({ id: 'a', done: true, completedDate: '2026-08-28T10:00:00' })]
  })
  const out = mergeStates(local, remote)
  assert.equal(out.todayTasks[0].done, true)
  assert.equal(out.todayTasks[0].completedDate, '2026-08-28T10:00:00')
})

test('mergeStates: tiempo trabajado y recordatorio se conservan', () => {
  const local = state({ todayTasks: [task({ id: 'a', timeSpentMs: 5000, remindAt: null })] })
  const remote = state({
    todayTasks: [task({ id: 'a', timeSpentMs: 1000, remindAt: '2026-08-29T09:00:00' })]
  })
  const out = mergeStates(local, remote)
  assert.equal(out.todayTasks[0].timeSpentMs, 5000)
  assert.equal(out.todayTasks[0].remindAt, '2026-08-29T09:00:00')
})

test('mergeStates: lastFocusedDate se queda con la fecha más reciente', () => {
  const local = state({ projects: [{ id: 'p', name: 'P', createdDate: '2026-08-01', tasks: [task({ id: 'a', lastFocusedDate: '2026-08-27' })] }] })
  const remote = state({ projects: [{ id: 'p', name: 'P', createdDate: '2026-08-01', tasks: [task({ id: 'a', lastFocusedDate: '2026-08-28' })] }] })
  const out = mergeStates(local, remote)
  assert.equal(out.projects[0].tasks[0].lastFocusedDate, '2026-08-28')
})

test('mergeStates: proyectos se unen y sus tareas también', () => {
  const local = state({
    projects: [{ id: 'p', name: 'P', createdDate: '2026-08-01', tasks: [task({ id: 't1' })] }]
  })
  const remote = state({
    projects: [
      { id: 'p', name: 'P (remoto)', createdDate: '2026-08-01', tasks: [task({ id: 't2' })] },
      { id: 'q', name: 'Q', createdDate: '2026-08-02', tasks: [] }
    ]
  })
  const out = mergeStates(local, remote)
  assert.deepEqual(new Set(out.projects.map((p) => p.id)), new Set(['p', 'q']))
  const p = out.projects.find((x) => x.id === 'p')!
  assert.equal(p.name, 'P', 'el nombre local manda')
  assert.deepEqual(new Set(p.tasks.map((t) => t.id)), new Set(['t1', 't2']))
})

test('mergeStates: racha toma los máximos; ajustes locales mandan', () => {
  const local = state({
    streak: { current: 3, best: 5, lastCountedDate: '2026-08-28', freezesAvailable: 1 },
    settings: { ...INITIAL_STATE.settings, theme: 'dark' }
  })
  const remote = state({
    streak: { current: 7, best: 4, lastCountedDate: '2026-08-27', freezesAvailable: 3 },
    settings: { ...INITIAL_STATE.settings, theme: 'light' }
  })
  const out = mergeStates(local, remote)
  assert.equal(out.streak.current, 7)
  assert.equal(out.streak.best, 5)
  assert.equal(out.streak.lastCountedDate, '2026-08-28')
  assert.equal(out.streak.freezesAvailable, 3)
  assert.equal(out.settings.theme, 'dark')
})

test('mergeStates: snapshots se unen por fecha, gana el más completo', () => {
  const local = state({
    snapshots: [
      { date: '2026-08-27', totalTasks: 3, completedTasks: 3, completionRate: 1, tasksCarriedOver: 0 }
    ]
  })
  const remote = state({
    snapshots: [
      { date: '2026-08-27', totalTasks: 5, completedTasks: 4, completionRate: 0.8, tasksCarriedOver: 1 },
      { date: '2026-08-28', totalTasks: 2, completedTasks: 2, completionRate: 1, tasksCarriedOver: 0 }
    ]
  })
  const out = mergeStates(local, remote)
  assert.equal(out.snapshots.length, 2)
  assert.equal(out.snapshots.find((s) => s.date === '2026-08-27')!.totalTasks, 5)
})
