/** Stub — la pantalla completa llega en Fase 3 (PLAN.md §4.2). */
export default function Summary(): React.JSX.Element {
  return (
    <div className="glass grid flex-1 place-items-center rounded-card p-6 text-center">
      <div className="max-w-sm">
        <h2 className="text-xl">Resumen</h2>
        <p className="mt-2 text-sm text-paper-dim">
          En qué trabajaste, progreso por proyecto, racha y puntos de mejora a partir de tus
          propios datos. Se construye en la Fase 3.
        </p>
      </div>
    </div>
  )
}
