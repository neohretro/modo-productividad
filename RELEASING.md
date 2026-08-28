# Sacar una versión nueva

La app se **actualiza sola**: al abrirse comprueba si hay una versión más nueva
publicada en GitHub Releases, la descarga y el usuario ve un aviso
_"Actualización lista — Reiniciar e instalar"_.

Para que eso funcione, cada versión nueva hay que **publicarla** siguiendo estos pasos.

## Una sola vez (setup inicial)

1. Crear el repositorio en GitHub: **`neohretro/modo-productividad`**
   (si va bajo otra cuenta/organización, cambia `owner`/`repo` en
   [`electron-builder.yml`](electron-builder.yml) → `publish:`).
2. Subir el código:
   ```
   git remote add origin https://github.com/neohretro/modo-productividad.git
   git push -u origin main
   ```
3. Crear un **Personal Access Token** de GitHub con permiso `repo`
   (Settings → Developer settings → Tokens). Guardarlo; se usa al publicar.

## Cada versión nueva

1. **Subir el número de versión** en [`package.json`](package.json):
   ```json
   "version": "0.2.0"
   ```
   (usa [semver](https://semver.org): `0.1.0` → `0.1.1` arregla bugs,
   `0.2.0` agrega cosas, `1.0.0` es el lanzamiento estable).

2. **Commit + tag**:
   ```
   git add -A && git commit -m "v0.2.0"
   git tag v0.2.0
   git push && git push --tags
   ```

3. **Compilar y publicar** (necesita el token del setup):
   ```
   set GH_TOKEN=el_token_aqui
   npm run release:win
   ```
   Esto:
   - compila la app (`electron-vite build`)
   - genera el instalador
   - crea un **release en GitHub** con estos archivos adjuntos:
     - `MODO-Creador-Productividad-0.2.0-setup.exe` (instalador)
     - `latest.yml` (el "aviso" que lee la app para saber que hay versión nueva)
     - `.blockmap` (descargas incrementales)

4. En GitHub, el release queda como **borrador**. Entrar a
   `github.com/neohretro/modo-productividad/releases`, revisar y darle
   **"Publish release"**.

5. Listo. En cuestión de horas las apps instaladas verán la actualización.
   (Para probarlo rápido: abrir la app → Ajustes → Actualizaciones →
   "Buscar actualizaciones".)

## La descarga en la web de MODO CREADOR

Para el botón _"Descargar para Windows"_ en la web, apuntar siempre al último
instalador. GitHub da una URL fija para eso:

```
https://github.com/neohretro/modo-productividad/releases/latest/download/MODO-Creador-Productividad-setup.exe
```

> Nota: la URL `latest/download/<nombre-sin-versión>` sólo funciona si el nombre
> del archivo no lleva la versión. Si se quiere esa URL limpia, cambiar
> `artifactName` en `electron-builder.yml` a
> `MODO-Creador-Productividad-setup.${ext}` (sin `${version}`).
> Si no, enlazar a la página del release: `.../releases/latest`.

## Sin firma de código

Los instaladores van **sin firmar**. Windows SmartScreen muestra un aviso azul
la primera vez ("Windows protegió tu PC" → _Más información_ → _Ejecutar de
todas formas_). No bloquea. Para quitarlo hace falta un certificado de firma
de código (OV ~150–300 USD/año). Se puede añadir después sin cambiar nada del
flujo: se configura el certificado en `electron-builder.yml` y listo.

## Mac

Desde una Mac: `npm run dist:mac`. Requiere firma/notarización de Apple para
distribución pública (cuenta de desarrollador, ~99 USD/año).
