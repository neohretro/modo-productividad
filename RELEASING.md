# Sacar una versión nueva

La app se **actualiza sola**: al abrirse comprueba si hay una versión más nueva
publicada en GitHub Releases, la descarga y el usuario ve un aviso
_"Actualización lista — Reiniciar e instalar"_.

## El setup ya está hecho

- Repositorio: **https://github.com/neohretro/modo-productividad** (público)
- La app apunta ahí para las actualizaciones (`electron-builder.yml` → `publish`)
- El token de GitHub se lee de tu sesión guardada — no hay que configurar nada

## Publicar una versión nueva — un solo comando

```
npm run release 0.2.0
```

Eso hace todo:

1. Sube el número en `package.json` (`0.1.0` → `0.2.0`)
2. Hace `git commit` + `git tag v0.2.0`
3. Compila la app y el instalador
4. **Crea el release en GitHub** con:
   - `MODO-Creador-Productividad-0.2.0-setup.exe` — el instalador
   - `latest.yml` — el aviso que lee la app
   - `.blockmap` — descargas incrementales
5. Sube el commit y la etiqueta
6. Abre la página del release en el navegador

En un rato, las apps instaladas verán la actualización. Para probarlo rápido:
abrir la app → **Ajustes → Actualizaciones → "Buscar actualizaciones"**.

### Qué número poner ([semver](https://semver.org))

| Cambio | Ejemplo |
| --- | --- |
| Arreglás bugs, nada nuevo | `0.1.0` → `0.1.1` |
| Agregás funciones | `0.1.1` → `0.2.0` |
| Lanzamiento estable / cambio grande | `0.9.0` → `1.0.0` |

El comando no deja publicar un número menor o igual al actual.

## El botón "Descargar" en la web de MODO CREADOR

Enlazar a la página del último release (siempre apunta a lo más nuevo):

```
https://github.com/neohretro/modo-productividad/releases/latest
```

Si querés un enlace directo al `.exe` sin abrir GitHub, hay que quitarle la
versión al nombre del archivo: en `electron-builder.yml` cambiar
`artifactName` a `MODO-Creador-Productividad-setup.${ext}`. Entonces el enlace
fijo es:

```
https://github.com/neohretro/modo-productividad/releases/latest/download/MODO-Creador-Productividad-setup.exe
```

## Sin firma de código

Los instaladores van **sin firmar**. Windows SmartScreen muestra un aviso azul
la primera vez ("Windows protegió tu PC" → _Más información_ → _Ejecutar de
todas formas_). No bloquea. Para quitarlo hace falta un certificado de firma
(OV ~150–300 USD/año); se añade en `electron-builder.yml` sin cambiar el flujo.

## Mac

Desde una Mac: `npm run dist:mac`. Para distribución pública necesita
firma/notarización de Apple (cuenta de desarrollador, ~99 USD/año).
