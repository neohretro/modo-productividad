import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { buildMonth, shiftMonth } from '@shared/calendar'
import { state, task } from './helpers'

const NOW = new Date(2026, 9, 15, 10, 0, 0) // 15 oct 2026 (jueves)

describe('vista de mes', () => {
  it('shiftMonth devuelve el día 1 del mes pedido', () => {
    assert.equal(shiftMonth('2026-10-15', 0), '2026-10-01')
    assert.equal(shiftMonth('2026-10-15', 1), '2026-11-01')
    assert.equal(shiftMonth('2026-01-31', -1), '2025-12-01')
    assert.equal(shiftMonth('2026-12-20', 1), '2027-01-01')
  })

  it('la cuadrícula empieza en lunes, termina en domingo y cubre todo el mes', () => {
    const cells = buildMonth(state(), '2026-10-15', NOW)
    assert.equal(cells.length % 7, 0)
    assert.equal(cells[0].iso, '2026-09-28') // 1 oct 2026 es jueves
    assert.equal(cells[cells.length - 1].iso, '2026-11-01')
    assert.equal(cells.filter((c) => c.inMonth).length, 31)
    assert.equal(cells.length, 35)
  })

  it('febrero que empieza en lunes cabe en 4 filas', () => {
    const cells = buildMonth(state(), '2027-02-10', NOW) // 1 feb 2027 es lunes, 28 días
    assert.equal(cells.length, 28)
  })

  it('cada día trae sus tareas (futuras por día asignado)', () => {
    const t = task({ text: 'grabar', scheduledDate: '2026-10-22' })
    const cells = buildMonth(state({ tasks: [t] }), '2026-10-01', NOW)
    const day = cells.find((c) => c.iso === '2026-10-22')
    assert.deepEqual(day?.tasks.map((x) => x.text), ['grabar'])
    assert.equal(cells.find((c) => c.iso === '2026-10-23')?.tasks.length, 0)
  })
})
