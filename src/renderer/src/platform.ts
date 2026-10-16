/** Sistema donde corre la ventana (para textos, atajos y detalles de estilo). */
export const IS_MAC = /Mac|iPhone|iPad/i.test(
  typeof navigator === 'undefined' ? '' : navigator.platform || navigator.userAgent
)

// El CSS lo usa para no pisar las barras de desplazamiento nativas de macOS.
if (IS_MAC && typeof document !== 'undefined') document.documentElement.classList.add('is-mac')
