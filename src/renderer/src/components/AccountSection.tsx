import { useState } from 'react'
import { Check, CloudCheck, CloudOff, LogOut, Mail, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSync } from '../hooks/useSync'

/**
 * Sección "Cuenta" de Ajustes. El login es opcional: solo habilita la
 * sincronización en la nube. Método: código de un solo uso al correo.
 */
export default function AccountSection(): React.JSX.Element | null {
  const { user, loading, configured } = useAuth()

  if (!configured) return null

  return (
    <section className="flex flex-col gap-2.5">
      <p className="px-1 text-[10px] uppercase tracking-[0.15em] text-paper-dim">Cuenta</p>
      <div className="glass rounded-card p-4">
        {loading ? (
          <p className="text-xs text-paper-dim">Cargando…</p>
        ) : user ? (
          <SignedIn email={user.email} />
        ) : (
          <SignInForm />
        )}
      </div>
    </section>
  )
}

function SignedIn({ email }: { email: string }): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const sync = useSync()

  const error = sync.phase === 'error'
  const line =
    sync.phase === 'syncing'
      ? 'Sincronizando…'
      : error
        ? (sync.message ?? 'Error al sincronizar')
        : sync.lastSyncedAt
          ? `Sincronizado ${relative(sync.lastSyncedAt)}`
          : 'Sincronización activada. Tus tareas se guardan en la nube.'

  return (
    <div className="flex items-center gap-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-orange-soft text-orange">
        {error ? <CloudOff size={17} strokeWidth={1.75} /> : <CloudCheck size={17} strokeWidth={1.75} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-paper">{email}</p>
        <p className={`text-xs leading-snug ${error ? 'text-orange' : 'text-paper-dim'}`}>{line}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => window.modo?.sync.now()}
          disabled={sync.phase === 'syncing'}
          aria-label="Sincronizar ahora"
          className="grid h-7 w-7 place-items-center rounded-lg text-paper-dim transition-colors hover:bg-ink-soft hover:text-paper disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            strokeWidth={2}
            className={sync.phase === 'syncing' ? 'animate-spin' : ''}
          />
        </button>
        <button
          onClick={async () => {
            setBusy(true)
            await window.modo?.auth.signOut()
            setBusy(false)
          }}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-chip border border-border-hi px-3 py-1.5 text-xs text-paper-dim transition-colors hover:border-orange hover:text-orange disabled:opacity-60"
        >
          <LogOut size={13} strokeWidth={2} />
          Salir
        </button>
      </div>
    </div>
  )
}

function relative(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 10) return 'ahora'
  if (s < 60) return `hace ${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

function SignInForm(): React.JSX.Element {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async (): Promise<void> => {
    setBusy(true)
    setError('')
    const res = await window.modo!.auth.requestCode(email)
    setBusy(false)
    if (res.ok) setStep('code')
    else setError(res.error ?? 'No se pudo enviar el código.')
  }

  const verify = async (): Promise<void> => {
    setBusy(true)
    setError('')
    const res = await window.modo!.auth.verifyCode(email, code, consent)
    setBusy(false)
    if (!res.ok) setError(res.error ?? 'No se pudo verificar el código.')
    // si ok, useAuth recibe el cambio y el componente se re-renderiza solo
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-orange-soft text-orange">
          <Mail size={17} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-paper">Inicia sesión para sincronizar</p>
          <p className="text-xs leading-snug text-paper-dim">
            Opcional. La app funciona sin cuenta; iniciar sesión guarda tus tareas en la nube y
            las tienes en varios equipos.
          </p>
        </div>
      </div>

      {step === 'email' ? (
        <>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && !busy && void send()}
            placeholder="tu@correo.com"
            className="w-full rounded-chip border border-border-hi bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-orange"
          />
          <button
            onClick={() => void send()}
            disabled={!email || busy}
            className="self-start rounded-chip bg-orange px-4 py-1.5 text-xs text-onaccent transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Enviando…' : 'Enviar código'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-paper-dim">
            Escribimos un código a <span className="text-paper">{email}</span>. Revisa tu correo.
          </p>
          <input
            inputMode="numeric"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && !busy && void verify()}
            placeholder="000000"
            className="w-full rounded-chip border border-border-hi bg-ink px-3 py-2 text-center text-lg tracking-[0.4em] text-paper outline-none focus:border-orange"
          />
          <label className="flex cursor-pointer items-start gap-2 text-xs text-paper-dim">
            <button
              type="button"
              role="checkbox"
              aria-checked={consent}
              onClick={() => setConsent((v) => !v)}
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                consent ? 'border-orange bg-orange text-onaccent' : 'border-border-hi'
              }`}
            >
              {consent && <Check size={11} strokeWidth={3} />}
            </button>
            <span>Quiero recibir novedades y consejos de MODO CREADOR por correo.</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
              }}
              className="rounded-chip px-3 py-1.5 text-xs text-paper-dim hover:text-paper"
            >
              Atrás
            </button>
            <button
              onClick={() => void verify()}
              disabled={code.length < 6 || busy}
              className="rounded-chip bg-orange px-4 py-1.5 text-xs text-onaccent transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <button
              onClick={() => void send()}
              disabled={busy}
              className="rounded-chip px-3 py-1.5 text-xs text-paper-dim hover:text-paper disabled:opacity-60"
            >
              Reenviar
            </button>
          </div>
        </>
      )}

      {error && <p className="text-xs text-orange">{error}</p>}
    </div>
  )
}
