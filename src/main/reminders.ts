import { Notification } from 'electron'
import { broadcastState, getState, setState } from './store'
import { showActiveWindow } from './windows'
import {
  clearRemindAts,
  collectReminders,
  remindableTasks,
  type PendingReminder
} from '../shared/reminders'

/** setTimeout de 32 bits: nada más largo se puede agendar de una sola vez. */
const MAX_DELAY = 2_147_483_647

const timers = new Map<string, NodeJS.Timeout>()

/** Cancela todos los temporizadores pendientes (al salir de la app). */
export function clearReminders(): void {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
}

/**
 * Re-agenda todos los recordatorios a partir del estado actual. Idempotente:
 * llámalo al arrancar y cada vez que el estado se guarde.
 */
export function syncReminders(): void {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()

  const state = getState()
  const now = Date.now()
  const { due, upcoming } = collectReminders(state, now)

  // Vencidos (sonaron con la app cerrada) → mostrar ya y limpiar su remindAt.
  if (due.length > 0) {
    for (const r of due) fire(r)
    const cleared = clearRemindAts(state, new Set(due.map((r) => r.id)))
    setState(cleared)
    broadcastState(cleared)
  }

  for (const r of upcoming) {
    const wait = r.at - now
    if (wait > MAX_DELAY) {
      // Demasiado lejos: despierta a mitad de camino y vuelve a agendar.
      timers.set(r.id, setTimeout(syncReminders, MAX_DELAY))
    } else {
      timers.set(r.id, setTimeout(() => onFire(r), Math.max(wait, 0)))
    }
  }
}

function onFire(r: PendingReminder): void {
  timers.delete(r.id)
  const state = getState()
  const task = remindableTasks(state).find((t) => t.id === r.id)
  // La tarea pudo cambiar entre agendar y disparar.
  if (!task || task.done || task.remindAt !== r.iso) return

  fire(r)
  const cleared = clearRemindAts(state, new Set([r.id]))
  setState(cleared)
  broadcastState(cleared)
}

function fire(r: PendingReminder): void {
  if (!Notification.isSupported()) return
  const n = new Notification({
    title: 'Recordatorio',
    body: r.text
  })
  n.on('click', () => showActiveWindow())
  n.show()
}
