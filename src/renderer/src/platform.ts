/** Sistema donde corre la ventana (para textos y atajos). */
export const IS_MAC = /Mac|iPhone|iPad/i.test(
  typeof navigator === 'undefined' ? '' : navigator.platform || navigator.userAgent
)
