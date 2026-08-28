/**
 * Genera los íconos de la app sin dependencias externas.
 * Isotipo MODO: la "O" como tarjeta negra redondeada, ventana blanca dentro,
 * y la "esquina activa" naranja arriba a la derecha.
 * Correr: node scripts/gen-icons.mjs
 */
import zlib from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../build')

const INK = [8, 8, 8]
const ORANGE = [255, 140, 0]
const WHITE = [255, 255, 255]

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Rectángulo con esquinas redondeadas uniformes. Devuelve 1 si (x,y) está dentro. */
function inRR(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

/** Rectángulo con SOLO la esquina superior derecha redondeada (la "esquina activa"). */
function inActiveCorner(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  if (x > x1 - r && y < y0 + r) {
    return (x - (x1 - r)) ** 2 + (y - (y0 + r)) ** 2 <= r * r
  }
  return true
}

/** Color del isotipo en coordenadas normalizadas 0..1024 (se escala luego). */
function isotipo(x, y) {
  const white = inRR(x, y, 232, 400, 792, 632, 48)
  const orange = inActiveCorner(x, y, 763, 128, 1010, 405, 110)
  const black = inRR(x, y, 92, 268, 918, 756, 66)

  if (white) return WHITE
  if (orange) return ORANGE
  if (black) return INK
  return null // transparente
}

/** PNG RGBA con supersampling 3× para bordes suaves. */
function png(size) {
  const SS = 3
  const N = size * SS
  const scale = 1024 / N

  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filtro: none
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = isotipo((x * SS + sx + 0.5) * scale, (y * SS + sy + 0.5) * scale)
          if (c) {
            r += c[0]
            g += c[1]
            b += c[2]
            a += 255
          }
        }
      }
      const n = SS * SS
      const o = y * stride + 1 + x * 4
      const alpha = a / n
      // premultiplicado inverso simple: color = suma / (nº muestras opacas)
      const opaque = a / 255
      raw[o] = opaque ? Math.round(r / opaque) : 0
      raw[o + 1] = opaque ? Math.round(g / opaque) : 0
      raw[o + 2] = opaque ? Math.round(b / opaque) : 0
      raw[o + 3] = Math.round(alpha)
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/** Empaqueta varios PNG en un .ico. */
function ico(sizes) {
  const images = sizes.map((s) => png(s))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)

  const entries = Buffer.alloc(16 * sizes.length)
  let offset = 6 + 16 * sizes.length
  sizes.forEach((s, i) => {
    const e = entries.subarray(i * 16, i * 16 + 16)
    e.writeUInt8(s >= 256 ? 0 : s, 0)
    e.writeUInt8(s >= 256 ? 0 : s, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(images[i].length, 8)
    e.writeUInt32LE(offset, 12)
    offset += images[i].length
  })

  return Buffer.concat([header, entries, ...images])
}

mkdirSync(OUT, { recursive: true })
writeFileSync(resolve(OUT, 'icon.png'), png(512))
writeFileSync(resolve(OUT, 'icon-32.png'), png(32))
writeFileSync(resolve(OUT, 'tray.png'), png(32))
writeFileSync(resolve(OUT, 'icon.ico'), ico([16, 24, 32, 48, 64, 128, 256]))
console.log('íconos generados en build/ (icon.png, icon.ico, tray.png)')
