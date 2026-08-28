import { useEffect } from 'react'
import type { ThemePref } from '@shared/types'
import { useAppStore } from './store/useAppStore'

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

/** Escribe data-theme en <html> según la preferencia; sigue al sistema si es 'system'. */
export function useTheme(): void {
  const pref = useAppStore((s) => s.settings.theme)

  useEffect(() => {
    const apply = (): void => {
      const resolved = resolve(pref)
      document.documentElement.dataset.theme = resolved
      window.modo?.setResolvedTheme(resolved)
    }
    apply()

    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])
}
