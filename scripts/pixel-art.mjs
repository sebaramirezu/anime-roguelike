import { randomUUID } from 'node:crypto'
import { link, mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import sharp from 'sharp'

export function pixelImage(width, height) {
  const pixels = Buffer.alloc(width * height * 4)
  const colors = new Map()
  function rectangle(x, y, w, h, hex) {
    let color = colors.get(hex)
    if (!color) {
      color = Buffer.from(hex + 'ff', 'hex')
      colors.set(hex, color)
    }
    const left = Math.max(0, x)
    const right = Math.min(width, x + w)
    if (left >= right) return
    for (let row = Math.max(0, y); row < Math.min(height, y + h); row++) {
      pixels.fill(color, (row * width + left) * 4, (row * width + right) * 4)
    }
  }
  function polygon(points, color) {
    const rows = points.map(([, y]) => y)
    for (let row = Math.min(...rows); row < Math.max(...rows); row++) {
      const center = row + .5
      const edges = points.flatMap(([x, y], index) => {
        const [nextX, nextY] = points[(index + 1) % points.length]
        if (center < Math.min(y, nextY) || center >= Math.max(y, nextY)) return []
        return [x + (center - y) * (nextX - x) / (nextY - y)]
      }).sort((a, b) => a - b)
      for (let i = 0; i + 1 < edges.length; i += 2) {
        const left = Math.ceil(edges[i] - .5)
        rectangle(left, row, Math.ceil(edges[i + 1] - .5) - left, 1, color)
      }
    }
  }
  function oval(x, y, rx, ry, color) {
    for (let dy = -ry; dy <= ry; dy++) {
      const dx = Math.floor(rx * Math.sqrt(1 - (dy / ry) ** 2))
      rectangle(x - dx, y + dy, dx * 2 + 1, 1, color)
    }
  }
  return {
    rectangle, polygon, oval,
    png: () => sharp(pixels, { raw: { width, height, channels: 4 } }).png({ palette: true, dither: 0 }).toBuffer(),
  }
}

export function pixelRandom(seed) {
  return (max) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return Math.floor(seed / 0x100000000 * max)
  }
}

export async function writePixelArt(path, png) {
  await mkdir(dirname(path), { recursive: true })
  const staging = `${path}.${randomUUID()}.tmp`
  await writeFile(staging, png, { flag: 'wx' })
  try {
    await link(staging, path)
    return true
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    return false
  } finally {
    await unlink(staging)
  }
}
