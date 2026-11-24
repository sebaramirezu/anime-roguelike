import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { itemIconTargets } from '../src/assets/itemIconPaths.ts'
import { inspectPng, spriteSize } from './enemy-sprite-png.mjs'
import { pixelImage, writePixelArt } from './pixel-art.mjs'

const repo = fileURLToPath(new URL('..', import.meta.url))
const drawings = {
  'saiyan-armor': ({ polygon: p }) => {
    p([[7,30],[9,18],[13,14],[22,14],[25,19],[39,19],[42,14],[51,14],[55,18],[57,30],[50,34],[48,47],[43,54],[21,54],[16,47],[14,34]], '171528')
    p([[16,27],[23,20],[27,25],[37,25],[41,20],[48,27],[46,45],[41,51],[23,51],[18,45]], '314d75')
    p([[19,27],[25,25],[29,28],[35,28],[39,25],[45,27],[43,39],[21,39]], 'e6dac0')
    p([[22,38],[42,38],[43,44],[40,49],[24,49],[21,44]], 'b5743a')
    p([[22,38],[42,38],[42,41],[22,41]], 'efbc69')
    p([[23,44],[41,44],[40,46],[24,46]], 'f4c371')
    p([[10,27],[12,19],[16,17],[22,17],[24,23],[20,29],[15,31]], 'ca8848')
    p([[40,23],[42,17],[48,17],[52,19],[54,27],[49,31],[44,29]], 'ca8848')
    p([[12,22],[15,18],[21,18],[22,21],[19,24],[12,26]], 'f8d487')
    p([[42,21],[43,18],[49,18],[52,22],[46,23]], 'f8d487')
    p([[24,28],[28,30],[36,30],[39,28],[40,31],[36,34],[25,34]], 'fff2d4')
  },
  'ki-barrier': ({ polygon: p, rectangle: r }) => {
    p([[20,7],[44,7],[44,11],[51,11],[51,18],[56,18],[56,42],[51,42],[51,49],[44,49],[44,54],[20,54],[20,49],[13,49],[13,42],[8,42],[8,18],[13,18],[13,11],[20,11]], '102740')
    p([[21,10],[43,10],[43,14],[49,14],[49,20],[53,20],[53,40],[49,40],[49,46],[43,46],[43,51],[21,51],[21,46],[15,46],[15,40],[11,40],[11,20],[15,20],[15,14],[21,14]], '40c6ed')
    p([[23,15],[41,15],[41,19],[46,19],[46,24],[49,24],[49,37],[45,41],[39,45],[25,45],[19,41],[15,37],[15,24],[18,24],[18,19],[23,19]], '196188')
    p([[19,23],[24,23],[24,19],[40,19],[40,23],[45,23],[40,37],[32,43],[24,37]], '79def1')
    p([[23,25],[41,25],[37,35],[32,39],[27,35]], '258cbe')
    r(27, 24, 10, 3, 'dcffff')
    r(30, 27, 4, 8, 'dcffff')
    r(18, 15, 7, 2, 'dcffff')
    r(12, 21, 2, 10, 'dcffff')
  },
  'vitality-orb': ({ oval: o, rectangle: r }) => {
    o(32, 32, 23, 23, '122b2b')
    o(32, 32, 20, 20, '237849')
    o(30, 29, 17, 16, '34b86a')
    o(27, 26, 12, 11, '65dc84')
    r(20, 20, 7, 3, 'd2ffb3')
    r(18, 23, 5, 3, 'd2ffb3')
    r(32, 20, 4, 3, 'a3f59a')
    r(37, 42, 8, 3, '48c375')
    r(34, 45, 6, 2, '48c375')
  },
}

export async function generateItemIcons(ids, { root = repo, validate = false } = {}) {
  const selection = new Set(ids.length ? ids : Object.keys(drawings))
  for (const id of selection) if (!Object.hasOwn(drawings, id)) throw new Error(`Icono desconocido: ${id}.`)
  for (const { id, path } of itemIconTargets.filter((target) => selection.has(target.id))) {
    const output = resolve(root, path)
    if (validate) {
      await inspectPng(await readFile(output), spriteSize)
      console.log(`Válido  ${path}  64 × 64 px con transparencia`)
      continue
    }
    const image = pixelImage(spriteSize, spriteSize)
    drawings[id](image)
    const png = await image.png()
    await inspectPng(png, spriteSize)
    const written = await writePixelArt(output, png)
    console.log(`${written ? 'Guardado ' : 'Conservado'}  ${path}`)
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2)
  try {
    await generateItemIcons(args.filter((arg) => arg !== '--validate'), { validate: args.includes('--validate') })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
