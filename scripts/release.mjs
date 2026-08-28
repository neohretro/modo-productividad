/**
 * Publica una versión nueva con un solo comando:
 *   npm run release 0.2.0
 *
 * Sube el número, hace commit + tag, compila, publica el release en GitHub
 * (con los archivos que necesita la auto-actualización) y sube todo.
 * El token de GitHub se lee de tu sesión ya guardada — no hay que configurar nada.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
const RELEASES = 'https://github.com/neohretro/modo-productividad/releases'

function die(msg) {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  die('Uso:  npm run release 0.2.0   (tres números separados por puntos)')
}

const run = (cmd, env) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } })
const out = (cmd, input) => execSync(cmd, { encoding: 'utf8', input }).trim()

// 1. El repo tiene que estar limpio (sin cambios a medias)
if (out('git status --porcelain')) {
  die('Tienes cambios sin guardar. Haz commit o descártalos antes de publicar.')
}

// 2. La versión tiene que ser mayor que la actual
const pkgUrl = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8'))
const cmp = (a, b) => a.split('.').map(Number).reduce((r, n, i) => r || n - b.split('.').map(Number)[i], 0)
if (cmp(version, pkg.version) <= 0) {
  die(`La versión ${version} no es mayor que la actual (${pkg.version}).`)
}

// 3. Token de GitHub desde el gestor de credenciales (el mismo que usa git push)
let token = ''
try {
  token = (out('git credential fill', 'protocol=https\nhost=github.com\n\n').match(/^password=(.+)$/m) ?? [])[1] ?? ''
} catch {
  /* sin sesión */
}
if (!token) {
  die('No encuentro tu sesión de GitHub. Corre `git push` una vez para iniciar sesión y reintenta.')
}

console.log(`\n  MODO CREADOR - Productividad\n  ${pkg.version}  →  ${version}\n`)

// 4. Subir el número y dejarlo commiteado + con etiqueta
pkg.version = version
writeFileSync(pkgUrl, JSON.stringify(pkg, null, 2) + '\n')
run('git add package.json')
run(`git commit -m "v${version}"`)
run(`git tag v${version}`)

// 5. Compilar y publicar el release (instalador + latest.yml + blockmap)
run('npm run release:win', { GH_TOKEN: token })

// 6. Subir el commit y la etiqueta
run('git push')
run('git push --tags')

console.log(`\n  ✓ Versión ${version} publicada.`)
console.log(`  Las apps instaladas la verán en las próximas horas (o al pulsar`)
console.log(`  "Buscar actualizaciones" en Ajustes).`)
console.log(`  Release:  ${RELEASES}/tag/v${version}\n`)
try {
  run(`start "" "${RELEASES}/tag/v${version}"`)
} catch {
  /* si no abre el navegador, no pasa nada */
}
