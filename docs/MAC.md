# MODO CREADOR - Productividad en Mac

## Cómo se genera el instalador

No se puede compilar para Mac desde Windows. Lo hace GitHub Actions
(`.github/workflows/release-mac.yml`) en un Mac virtual:

1. En Windows, `npm run release X.Y.Z` publica el release (instalador de Windows).
2. Al publicarse el release, el flujo **"Instalador de Mac"** arranca solo, compila y
   agrega al mismo release dos archivos:
   - `MODO-Creador-Productividad-X.Y.Z-mac-arm64.dmg` (Mac con chip Apple: M1, M2, M3…)
   - `MODO-Creador-Productividad-X.Y.Z-mac-x64.dmg` (Mac con Intel)
3. Tarda unos 5 a 10 minutos. Se sigue en la pestaña **Actions** del repositorio.

Para repetirlo a mano (si falló): Actions → "Instalador de Mac" → Run workflow →
la etiqueta (por ejemplo `v0.6.3`).

Necesita dos **variables** del repositorio (Settings → Secrets and variables → Actions →
Variables): `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Son valores públicos; sin ellas el
instalador saldría sin la opción de sincronizar.

## Instalar en un Mac (sin firma de Apple)

La app NO está firmada ni notarizada (eso requiere Apple Developer, 99 USD al año), así
que macOS la bloquea la primera vez:

1. Abre el `.dmg` y arrastra la app a **Aplicaciones**.
2. En Aplicaciones, haz **clic derecho → Abrir** y confirma **Abrir** (solo la primera vez).
3. Si macOS dice que "está dañada" (pasa en algunas versiones), abre la Terminal y ejecuta:

```
xattr -cr "/Applications/MODO CREADOR - Productividad.app"
```

Después se abre con normalidad.

## Qué cambia en Mac

- **Actualizaciones:** sin firma no pueden instalarse solas. La app avisa cuando hay una
  versión nueva y abre la página de descargas; hay que bajar e instalar el `.dmg` a mano.
- El atajo global usa **⌘** en lugar de Ctrl.
- "Iniciar con el Mac" abre la app en segundo plano al iniciar sesión.
- Los botones rojo/amarillo/verde de la ventana quedan a la izquierda de la barra superior.

## Pendiente: firmar y notarizar (cuando haya cuenta de Apple Developer)

1. Crear certificado "Developer ID Application" y exportarlo como `.p12`.
2. Guardar como secretos del repositorio: `CSC_LINK` (el .p12 en base64), `CSC_KEY_PASSWORD`,
   `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
3. En `electron-builder.yml`: quitar `identity: '-'`, poner `hardenedRuntime: true` y
   `notarize: true`; en el flujo quitar `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` y pasar los secretos.
4. Agregar el destino `zip` al `mac.target` y quitar el modo manual de actualización
   (`MANUAL_UPDATES` en `src/main/updater.ts`) para que se actualice sola.

## Sin probar en un Mac real

Todo esto se preparó sin acceso a un Mac. La primera vez conviene revisar en uno: que la ventana
se vea bien (barra superior, ventana mini translúcida), el atajo, el inicio automático y las
notificaciones.
