/**
 * Genera los íconos de la app sin dependencias externas.
 * Isotipo MODO: cuadrado casi negro con la "esquina activa" naranja arriba a la derecha.
 * Correr: node scripts/gen-icons.mjs
 */
import zlib from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../build')

const INK = [7, 7, 7]
const ORANGE = [255, 140, 0]

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

/** draw(x, y, size) -> [r, g, b, a] */
function png(size, draw) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filtro: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size)
      const o = y * stride + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function icon(x, y, size) {
  const pad = Math.round(size * 0.14)
  const inside = x >= pad && x < size - pad && y >= pad && y < size - pad
  if (!inside) return [0, 0, 0, 0]

  // esquina activa: cuña naranja arriba-derecha
  const cx = size - pad
  const cy = pad
  const wedge = size * 0.42
  const inWedge = cx - x + (y - cy) < wedge && x > size - pad - wedge && y < pad + wedge

  const [r, g, b] = inWedge ? ORANGE : INK
  return [r, g, b, 255]
}

/** Empaqueta varios PNG en un .ico (Windows / electron-builder). */
function ico(sizes) {
  const images = sizes.map((s) => png(s, icon))
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
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(images[i].length, 8)
    e.writeUInt32LE(offset, 12)
    offset += images[i].length
  })

  return Buffer.concat([header, entries, ...images])
}

mkdirSync(OUT, { recursive: true })
writeFileSync(resolve(OUT, 'icon.png'), png(512, icon))
writeFileSync(resolve(OUT, 'icon-32.png'), png(32, icon))
writeFileSync(resolve(OUT, 'tray.png'), png(32, icon))
writeFileSync(resolve(OUT, 'icon.ico'), ico([16, 24, 32, 48, 64, 128, 256]))
console.log('íconos generados en build/ (png, ico, tray)')
