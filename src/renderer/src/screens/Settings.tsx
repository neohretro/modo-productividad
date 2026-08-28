import { useEffect, useState } from 'react'

/** Stub — opciones reales (inicio con Windows, atajo global) en Fase 2. */
export default function Settings(): React.JSX.Element {
  const [version, setVersion] = useState('0.1.0')

  useEffect(() => {
    window.modo?.getAppVersion().then(setVersion).catch(() => undefined)
  }, [])

  return (
    <div className="glass grid flex-1 place-items-center rounded-card p-6 text-center">
      <div className="max-w-sm">
        <h2 className="text-xl">Ajustes</h2>
        <p className="mt-2 text-sm text-paper-dim">
          Inicio automático con Windows, atajo global y modo mini flotante llegan en la Fase 2.
        </p>
        <p className="mt-4 text-xs text-paper-dim/70">MODO CREADOR - Productividad · v{version}</p>
      </div>
    </div>
  )
}
