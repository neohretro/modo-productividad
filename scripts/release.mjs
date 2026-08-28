/**
 * Publica una versión nueva con un solo comando:
 *   npm run release 0.2.0
 *
 * Compila, sube el instalador a GitHub Releases (con lo que necesita la
 * auto-actualización) y deja el commit + etiqueta. El token de GitHub se lee de
 * tu sesión ya guardada — no hay que configurar nada.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const OWNER = 'neohretro'
const REPO = 'modo-productividad'

const version = process.argv[2]
const releasesUrl = `https://github.com/${OWNER}/${REPO}/releases`

function die(msg) {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  die('Uso:  npm run release 0.2.0   (tres números separados por puntos)')
}

const sh = (cmd, env) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } })
const cap = (cmd, input) => execSync(cmd, { encoding: 'utf8', input }).trim()

// 1. Repo limpio
if (cap('git status --porcelain')) {
  die('Tienes cambios sin guardar. Haz commit o descártalos antes de publicar.')
}

// 2. Versión mayor que la actual
const pkgUrl = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8'))
const prev = pkg.version
const gt = (a, b) => {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number))
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2]
}
if (gt(version, prev) <= 0) die(`La versión ${version} no es mayor que la actual (${prev}).`)

// 3. Token de GitHub (el mismo que usa git push)
let token = ''
try {
  token = (cap('git credential fill', 'protocol=https\nhost=github.com\n\n').match(/^password=(.+)$/m) ?? [])[1] ?? ''
} catch {
  /* sin sesión */
}
if (!token) die('No encuentro tu sesión de GitHub. Corre `git push` una vez y reintenta.')

console.log(`\n  MODO CREADOR - Productividad\n  ${prev}  →  ${version}\n`)

// 4. Subir el número (todavía sin commitear: si algo falla, se revierte)
pkg.version = version
writeFileSync(pkgUrl, JSON.stringify(pkg, null, 2) + '\n')

function revertVersion() {
  pkg.version = prev
  writeFileSync(pkgUrl, JSON.stringify(pkg, null, 2) + '\n')
}

// 5. Compilar + publicar (reintenta: la subida grande a veces corta)
let published = false
for (let attempt = 1; attempt <= 3 && !published; attempt++) {
  try {
    if (attempt > 1) console.log(`\n  Reintentando la publicación (${attempt}/3)…\n`)
    sh('npm run release:win', { GH_TOKEN: token })
    published = true
  } catch {
    if (attempt === 3) {
      revertVersion()
      die('No se pudo compilar/publicar después de 3 intentos. La versión se revirtió.')
    }
  }
}

// 6. Commit del bump + subir main.
sh('git add package.json')
sh(`git commit -m "v${version}"`)
sh('git push')

// 7. Dejar la etiqueta `v${version}` apuntando al commit del bump.
//    electron-builder pudo crearla ya (apuntando al commit anterior); la
//    reescribimos. IMPORTANTE: borrar la etiqueta de un release PUBLICADO lo
//    devuelve a borrador — por eso el "des-borrar" del paso 8 va DESPUÉS.
try {
  sh(`git push origin :refs/tags/v${version}`)
} catch {
  /* puede no existir aún */
}
sh(`git tag -f v${version}`)
sh(`git push origin v${version}`)

// 8. Publicar el release contra la etiqueta ya correcta (electron-builder lo
//    deja en borrador, y borrar la etiqueta en el paso 7 también lo re-borra).
try {
  const list = JSON.parse(
    cap(`curl -s -H "Authorization: Bearer ${token}" "https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=20"`)
  )
  const rel = list.find((r) => r.tag_name === `v${version}`)
  if (!rel) {
    console.log('  ⚠ No encuentro el release en GitHub — publícalo a mano.')
  } else if (rel.draft) {
    cap(
      `curl -s -X PATCH -H "Authorization: Bearer ${token}" ` +
        `"https://api.github.com/repos/${OWNER}/${REPO}/releases/${rel.id}" ` +
        `-d "{\\"draft\\":false,\\"tag_name\\":\\"v${version}\\",\\"name\\":\\"${version}\\"}"`
    )
    console.log('  Release publicado.')
  }
} catch {
  console.log('  ⚠ No pude des-borrar el release por API — revísalo en GitHub.')
}

console.log(`\n  ✓ Versión ${version} publicada.`)
console.log('  Las apps instaladas la verán en las próximas horas (o al pulsar')
console.log('  "Buscar actualizaciones" en Ajustes).')
console.log(`  ${releasesUrl}/tag/v${version}\n`)
try {
  sh(`start "" "${releasesUrl}/tag/v${version}"`)
} catch {
  /* si no abre el navegador, da igual */
}
