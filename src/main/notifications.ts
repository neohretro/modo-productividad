import { Notification, shell } from 'electron'

const APA_URL = 'https://www.apa.org/topics/research/multitasking'
let lastShown = 0

/**
 * Aviso suave (no bloqueante) cuando el usuario enfoca varias tareas a la vez.
 * Dato: American Psychological Association — el cambio de tarea puede costar
 * hasta ~40% de productividad.
 */
export function notifyMultitask(count: number): void {
  const now = Date.now()
  if (now - lastShown < 30_000) return
  lastShown = now

  if (!Notification.isSupported()) return

  const n = new Notification({
    title: `Estás enfocando ${count} tareas a la vez`,
    body:
      'El multitasking puede bajar tu productividad hasta ~40% por el costo de ' +
      'cambiar de tarea (American Psychological Association). Avanzas más rápido ' +
      'con una sola — pero tú decides.'
  })
  n.on('click', () => shell.openExternal(APA_URL))
  n.show()
}
