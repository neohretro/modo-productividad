import { test } from 'vitest'
import assert from 'node:assert/strict'
import type { PersistedState } from '@shared/types'
import { normalizeState } from '@shared/focus'
import { toCloudBlob } from '@shared/migrate'
import { state, task } from './helpers'

const NOW_DATE = new Date('2026-08-28T12:00:00')
const NOW = NOW_DATE.getTime()

/** Un estado como lo guardaban las versiones ≤ 4 (listas separadas). */
function legacyState(): Partial<PersistedState> {
  const legacyTask = (over: Record<string, unknown>) => ({
    ...task(),
    projectId: 'today',
    ...over
  })
  return {
    version: 4,
    todayTasks: [
      legacyTask({ id: 'h1', text: 'hoy hecha', done: true, completedDate: '2026-08-28T09:00:00', createdDate: '2026-08-28' }),
      legacyTask({ id: 'h2', text: 'hoy rodando', daysRolled: 2, createdDate: '2026-08-25' })
    ],
    scheduledTasks: [legacyTask({ id: 's1', text: 'futura', scheduledDate: '2026-09-03' })],
    projects: [
      {
        id: 'p1',
        name: 'Tinkko',
        createdDate: '2026-08-01',
        tasks: [
          task({ id: 'pt1', text: 'en curso hoy', projectId: 'p1', lastFocusedDate: '2026-08-28', timeSpentMs: 60_000 }),
          task({ id: 'pt2', text: 'sin tocar', projectId: 'p1' }),
          task({ id: 'pt3', text: 'hecha', projectId: 'p1', done: true, completedDate: '2026-08-20T10:00:00' })
        ]
      }
    ],
    archivedTasks: [
      legacyTask({ id: 'a1', text: 'archivada suelta', done: true }),
      task({ id: 'a2', text: 'archivada de proyecto', projectId: 'p1', done: true })
    ],
    snapshots: [],
    lastRolloverDate: '2026-08-28'
  } as unknown as Partial<PersistedState>
}

test('migración: no se pierde ninguna tarea y cada una cae donde debe', () => {
  const out = normalizeState(legacyState(), NOW)

  assert.equal(out.version, 5)
  assert.deepEqual(
    new Set(out.tasks.map((t) => t.id)),
    new Set(['h1', 'h2', 's1', 'pt1', 'pt2', 'pt3'])
  )
  assert.deepEqual(new Set(out.archivedTasks.map((t) => t.id)), new Set(['a1', 'a2']))

  const byId = (id: string) => out.tasks.find((t) => t.id === id)!
  // lista continua de Hoy: sin proyecto, con día de hoy o anterior
  assert.equal(byId('h1').projectId, null)
  assert.ok(byId('h1').scheduledDate! <= '2026-08-28')
  assert.equal(byId('h2').daysRolled, 2, 'conserva los días rodando')
  assert.ok(byId('h2').scheduledDate! <= '2026-08-28')
  // programada: conserva su día
  assert.equal(byId('s1').scheduledDate, '2026-09-03')
  assert.equal(byId('s1').projectId, null)
  // tareas de proyecto: etiqueta; la que se trabajaba hoy queda en Hoy, el resto suelta
  assert.equal(byId('pt1').projectId, 'p1')
  assert.equal(byId('pt1').scheduledDate, '2026-08-28')
  assert.equal(byId('pt1').timeSpentMs, 60_000, 'conserva el tiempo trabajado')
  assert.equal(byId('pt2').projectId, 'p1')
  assert.equal(byId('pt2').scheduledDate, null)
  assert.equal(byId('pt3').done, true)
  // archivadas: el viejo 'today' pasa a "sin proyecto"
  assert.equal(out.archivedTasks.find((t) => t.id === 'a1')!.projectId, null)
  assert.equal(out.archivedTasks.find((t) => t.id === 'a2')!.projectId, 'p1')
  // el proyecto ya no guarda tareas dentro
  assert.equal('tasks' in out.projects[0], false)
  assert.equal(out.projects[0].name, 'Tinkko')
})

test('migración: es idempotente (migrar dos veces da lo mismo)', () => {
  const once = normalizeState(legacyState(), NOW)
  const twice = normalizeState(once, NOW)
  assert.deepEqual(twice, once)
})

test('migración: un estado vacío o recién instalado no revienta', () => {
  const out = normalizeState({}, NOW)
  assert.equal(out.version, 5)
  assert.deepEqual(out.tasks, [])
  assert.deepEqual(out.projects, [])
})

test('nube: el blob lleva el formato nuevo + un espejo del viejo, y se lee sin duplicar', () => {
  const s = normalizeState(legacyState(), NOW)
  const blob = toCloudBlob(s, NOW_DATE) as unknown as Partial<PersistedState> & {
    todayTasks: { id: string; projectId: string }[]
    scheduledTasks: { id: string }[]
    projects: { id: string; tasks: { id: string }[] }[]
  }

  // espejo para versiones antiguas
  assert.deepEqual(new Set(blob.todayTasks.map((t) => t.id)), new Set(['h1', 'h2']))
  assert.ok(blob.todayTasks.every((t) => t.projectId === 'today'))
  assert.deepEqual(blob.scheduledTasks.map((t) => t.id), ['s1'])
  assert.deepEqual(new Set(blob.projects[0].tasks.map((t) => t.id)), new Set(['pt1', 'pt2', 'pt3']))

  // esta versión lee `tasks` y no duplica con el espejo
  const back = normalizeState(blob, NOW)
  assert.equal(back.tasks.length, s.tasks.length)
  assert.deepEqual(new Set(back.tasks.map((t) => t.id)), new Set(s.tasks.map((t) => t.id)))
})

test('nube: una versión vieja que reescribe el blob (v4) no hace perder tareas', () => {
  const s = normalizeState(legacyState(), NOW)
  const blob = toCloudBlob(s, NOW_DATE) as Record<string, unknown>
  // Lo que subiría una app antigua: solo el formato viejo, versión 4, sin `tasks`.
  const fromOldClient = { ...blob, version: 4 }
  delete fromOldClient.tasks
  const back = normalizeState(fromOldClient as Partial<PersistedState>, NOW)
  assert.deepEqual(new Set(back.tasks.map((t) => t.id)), new Set(s.tasks.map((t) => t.id)))
  // las de proyecto conservan su etiqueta
  assert.equal(back.tasks.find((t) => t.id === 'pt2')!.projectId, 'p1')
})

test('nube: las sueltas sin proyecto viajan en el espejo (no se pierden)', () => {
  const loose = task({ id: 'x', text: 'suelta', projectId: null, scheduledDate: null })
  const blob = toCloudBlob(state({ tasks: [loose] }), NOW_DATE) as { scheduledTasks: { id: string }[] }
  assert.deepEqual(blob.scheduledTasks.map((t) => t.id), ['x'])
})
