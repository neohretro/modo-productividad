import { INITIAL_STATE, type PersistedState, type Task } from '@shared/types'

/** Tarea de prueba con todos los campos del modelo actual. */
export function task(over: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    text: 't',
    done: false,
    projectId: null,
    createdDate: '2026-08-27',
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

/** Estado de prueba (copia profunda del inicial) con los campos que se pasen. */
export function state(over: Partial<PersistedState> = {}): PersistedState {
  return { ...structuredClone(INITIAL_STATE), ...over }
}
