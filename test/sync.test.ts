import { test } from 'vitest'
import assert from 'node:assert/strict'
import { INITIAL_STATE } from '@shared/types'
import { isPristine, mergeStates, stateFingerprint } from '@shared/sync'
import { state, task } from './helpers'

const proj = (id: string, name: string) => ({ id, name, createdDate: '2026-08-01' })

test('isPristine: estado inicial sí, con una tarea no', () => {
  assert.equal(isPristine(state()), true)
  assert.equal(isPristine(state({ tasks: [task()] })), false)
  assert.equal(
    isPristine(state({ streak: { current: 2, best: 2, lastCountedDate: null, freezesAvailable: 1 } })),
    false
  )
})

test('stateFingerprint ignora cambios no sincronizables y es estable', () => {
  const a = state({ tasks: [task({ id: 'x', text: 'hola' })] })
  const b = state({ tasks: [task({ id: 'x', text: 'hola' })], version: 999 })
  assert.equal(stateFingerprint(a), stateFingerprint(b))
})

test('mergeStates: une tareas por id de ambos equipos', () => {
  const local = state({ tasks: [task({ id: 'a', text: 'a' })] })
  const remote = state({ tasks: [task({ id: 'b', text: 'b' })] })
  const out = mergeStates(local, remote)
  assert.deepEqual(new Set(out.tasks.map((t) => t.id)), new Set(['a', 'b']))
})

test('mergeStates: si una copia está hecha, gana la hecha', () => {
  const local = state({ tasks: [task({ id: 'a', done: false })] })
  const remote = state({
    tasks: [task({ id: 'a', done: true, completedDate: '2026-08-28T10:00:00' })]
  })
  const out = mergeStates(local, remote)
  assert.equal(out.tasks[0].done, true)
  assert.equal(out.tasks[0].completedDate, '2026-08-28T10:00:00')
})

test('mergeStates: tiempo trabajado y recordatorio se conservan', () => {
  const local = state({ tasks: [task({ id: 'a', timeSpentMs: 5000, remindAt: null })] })
  const remote = state({
    tasks: [task({ id: 'a', timeSpentMs: 1000, remindAt: '2026-08-29T09:00:00' })]
  })
  const out = mergeStates(local, remote)
  assert.equal(out.tasks[0].timeSpentMs, 5000)
  assert.equal(out.tasks[0].remindAt, '2026-08-29T09:00:00')
})

test('mergeStates: conserva etiqueta y día asignado aunque solo una copia los tenga', () => {
  const local = state({ tasks: [task({ id: 'a', projectId: null, scheduledDate: null })] })
  const remote = state({ tasks: [task({ id: 'a', projectId: 'p1', scheduledDate: '2026-09-01' })] })
  const out = mergeStates(local, remote)
  assert.equal(out.tasks[0].projectId, 'p1')
  assert.equal(out.tasks[0].scheduledDate, '2026-09-01')
})

test('mergeStates: lastFocusedDate se queda con la fecha más reciente', () => {
  const local = state({ tasks: [task({ id: 'a', lastFocusedDate: '2026-08-27' })] })
  const remote = state({ tasks: [task({ id: 'a', lastFocusedDate: '2026-08-28' })] })
  const out = mergeStates(local, remote)
  assert.equal(out.tasks[0].lastFocusedDate, '2026-08-28')
})

test('mergeStates: proyectos (etiquetas) se unen; el nombre local manda', () => {
  const local = state({ projects: [proj('p', 'P')] })
  const remote = state({ projects: [proj('p', 'P (remoto)'), proj('q', 'Q')] })
  const out = mergeStates(local, remote)
  assert.deepEqual(new Set(out.projects.map((p) => p.id)), new Set(['p', 'q']))
  assert.equal(out.projects.find((p) => p.id === 'p')!.name, 'P')
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
