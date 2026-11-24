import { randomUUID } from 'node:crypto'
import { link, lstat, mkdir, open, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { allEnemies } from '../src/data/enemies.ts'
import { enemySpritePaths } from '../src/assets/enemySpritePaths.ts'
import { heroSpriteTargets } from '../src/assets/heroSpritePaths.ts'
import { itemIconTargets } from '../src/assets/itemIconPaths.ts'
import { inspectPng, normalizeSprite, sourceSize, spriteSize } from './enemy-sprite-png.mjs'

const repo = fileURLToPath(new URL('..', import.meta.url))
const pilot = ['goku-raditz', 'goku-cui', 'naruto-zabuza', 'naruto-mist-ninja', ...heroSpriteTargets.map(({ id }) => id)]
const targets = [...allEnemies.map((enemy) => ({ ...enemy, path: enemySpritePaths(enemy).pixelIdle })), ...heroSpriteTargets, ...itemIconTargets]
const targetsById = new Map(targets.map((target) => [target.id, target]))
const model = 'gpt-image-2.6-sunburst'
const quality = 'low'
const size = `${sourceSize}x${sourceSize}`
const pricesChecked = '2026-11-23'
const imageMicrosPerToken = 30
const textMicrosPerToken = 5
// 823 output tokens per 1024 × 1024 low-quality image in the official calculator.
const outputEstimateMicros = 823 * imageMicrosPerToken
const estimatedMicros = outputEstimateMicros + 1_000 * textMicrosPerToken
const pricingUrl = 'https://developers.openai.com/api/docs/pricing#images'
const identities = {
  'goku-raditz': 'Adult Saiyan with very long spiky black hair, green scouter, brown shoulder guards and tail around his waist.',
  'goku-cui': 'Purple-skinned alien officer Cui with a domed bald head, scouter and Frieza Force battle armor.',
  'goku-dodoria': 'Stocky pink alien Dodoria with a spiked head and Frieza Force battle armor, in a heavy charging stance.',
  'goku-piccolo': 'Green Namekian Piccolo with pointed ears, purple gi, blue sash, white cape and turban in a ready combat stance.',
  'goku-freezer': 'Frieza in his recognizable white-and-violet final form, with his long tail.',
  'naruto-zabuza': 'Zabuza Momochi with bandaged lower face, slanted Mist forehead protector and broad cleaver sword.',
  'naruto-mist-ninja': 'An original rank-and-file Hidden Mist shinobi with a Mist forehead protector, muted teal gear and kunai.',
  'goku-base': 'Goku in orange and blue training clothes, with his black spiky hair.',
  'goku-ultra-instinct': 'Ultra Instinct Goku with silver hair and torn orange training pants. Keep the outline free of any aura.',
  'naruto-base': 'Naruto Uzumaki with blond spiky hair, orange and black outfit, and Leaf forehead protector.',
  'naruto-baryon': 'Naruto Baryon Mode with a red-orange chakra cloak, fox-ear silhouette and dark eye markings.',
  'saiyan-armor': 'An empty blue and gold Saiyan battle cuirass with shoulder plates. Show the armor by itself.',
  'ki-barrier': 'A compact electric cyan energy shield with a stepped circular boundary and a bright abstract guard symbol.',
  'vitality-orb': 'A single emerald-green vitality sphere with a few discrete reflective pixels and a dark outline.',
}
const help = `Uso con Node.js 22.18 o posterior
  npm run sprites:enemies -- --list
  npm run sprites:enemies -- goku-raditz --dry-run
  npm run sprites:enemies -- --pilot --dry-run
  npm run sprites:enemies -- --pilot --generate --max-usd 0.24
  npm run sprites:enemies -- --pilot --validate

Puedes indicar varios IDs separados por espacios. La simulación es el modo predeterminado.
--pilot selecciona cuatro enemigos, dos héroes y dos transformaciones.
--generate requiere --max-usd y confirmación interactiva.
--validate comprueba los PNG instalados de la selección.`

function promptFor(target) {
  const series = target.character === 'goku' ? 'Dragon Ball' : 'Naruto'
  if (target.kind === 'item') return [
    `Original inventory icon for ${target.name} from ${series}. ${identities[target.id]}`,
    'Strict 2D pixel art on a 64x64 logical pixel grid, clean square pixels, dark outlines, discrete shading clusters and up to 24 colors.',
    'Show one centered object in a true transparent background with clear padding. No people, floor, shadows, text, frame, UI, gradients or soft antialiasing.',
  ].join(' ')
  return [
    `Original idle combat sprite for ${target.name} from ${series}. ${identities[target.id] ?? 'Keep the recognizable costume, colors and silhouette.'}`,
    'Strict 2D pixel art, modern retro RPG battle sprite and game-ready asset. Draw on a 64x64 logical pixel grid enlarged in hard square pixels.',
    'Use a limited palette of up to 24 colors, one-pixel dark outlines, clean pixel clusters and two or three discrete shades per material. Use upper-left lighting.',
    'One full-body combat sprite, three-quarter side view facing right, with a readable silhouette and sprite-like proportions.',
    'Use a stable, legible combat stance for CSS animation. Center the complete figure and equipment with clear padding and feet aligned near the bottom.',
    'True transparent background behind every part of the character. No floor, shadow, aura, scenery, text, UI, watermark or border.',
    'No digital painting, realistic anime illustration, smooth shading, cinematic rendering, high-detail painted look, HD look, photographic gradients or heavy anti-aliasing.',
    'Draw a new pose and composition without copying a specific illustration.',
  ].join(' ')
}

function parseBudget(value) {
  if (value === undefined) return undefined
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) throw new Error('Indica un presupuesto válido en USD, por ejemplo 0.12.')
  const [dollars, fraction = ''] = value.split('.')
  const micros = Number(dollars) * 1_000_000 + Number(fraction.padEnd(6, '0'))
  if (!Number.isSafeInteger(micros)) throw new Error('El presupuesto en USD está fuera del rango permitido.')
  return micros
}

const usd = (micros) => `USD ${(micros / 1_000_000).toFixed(6).replace(/0$/, '')}`

async function exists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function confirmGeneration() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Abre una terminal interactiva para autorizar el gasto.')
  }
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await terminal.question('Escribe GENERAR para autorizar este lote pagado > ')).trim() === 'GENERAR'
  } finally {
    terminal.close()
  }
}

async function requestImage(target, apiKey) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, prompt: promptFor(target), n: 1, size, quality, background: 'transparent', output_format: 'png',
    }),
    redirect: 'error',
    signal: AbortSignal.timeout(240_000),
  })
  if (!response.ok) throw new Error(`OpenAI respondió HTTP ${response.status}.`)
  const { data, usage } = await response.json()
  const encoded = data?.[0]?.b64_json
  if (typeof encoded !== 'string' || !encoded) throw new Error('OpenAI devolvió una respuesta sin imagen PNG.')
  const bytes = Buffer.from(encoded, 'base64')
  return { bytes, usage }
}

async function generateSprite(job, apiKey) {
  if (await exists(job.path)) return undefined
  await mkdir(dirname(job.path), { recursive: true })
  const lockPath = `${job.path}.lock`
  let lock
  try {
    lock = await open(lockPath, 'wx')
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Ya hay una generación en curso o interrumpida en ${job.relative}.lock.`)
    throw error
  }

  const staging = `${job.path}.${randomUUID()}.tmp`
  try {
    if (await exists(job.path)) return undefined
    const { bytes, usage } = await requestImage(job.target, apiKey)
    const png = await normalizeSprite(bytes, job.target.kind === 'item')
    await writeFile(staging, png, { flag: 'wx' })
    try {
      // Publish the complete file atomically without replacing a PNG added during the request.
      await link(staging, job.path)
      console.log(`Guardado  ${job.relative}  ${spriteSize} × ${spriteSize} px  alfa comprobado`)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      console.log(`Conservado  ${job.relative}  apareció durante la generación`)
    }
    if (!Number.isSafeInteger(usage?.input_tokens) || !Number.isSafeInteger(usage?.output_tokens)
      || usage.input_tokens < 0 || usage.output_tokens < 0) return null
    return usage.input_tokens * textMicrosPerToken + usage.output_tokens * imageMicrosPerToken
  } finally {
    try {
      await unlink(staging).catch((error) => {
        if (error.code !== 'ENOENT') throw error
      })
    } finally {
      await lock.close()
      await unlink(lockPath)
    }
  }
}

export async function run(args, { root = repo, authorize = confirmGeneration } = {}) {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      list: { type: 'boolean' },
      pilot: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      generate: { type: 'boolean' },
      validate: { type: 'boolean' },
      'max-usd': { type: 'string' },
    },
  })
  if (values.help || !args.length) {
    console.log(help)
    return
  }
  if ([values.list, values['dry-run'], values.generate, values.validate].filter(Boolean).length > 1) {
    throw new Error('Elige un solo modo entre --list, --dry-run, --generate y --validate.')
  }
  const ids = [...new Set([...(values.pilot ? pilot : []), ...positionals])]
  if (!values.list && !ids.length) throw new Error('Selecciona uno o más IDs o usa --pilot. Consulta --list.')
  for (const id of ids) {
    if (!targetsById.has(id)) throw new Error(`ID desconocido ${id}. Consulta --list.`)
  }
  const budgetMicros = parseBudget(values['max-usd'])
  const selection = values.list && !ids.length ? targets : ids.map((id) => targetsById.get(id))
  const jobs = await Promise.all(selection.map(async (target) => {
    const relative = target.path
    const path = resolve(root, relative)
    return { target, relative, path, installed: await exists(path) }
  }))
  const pending = jobs.filter((job) => !job.installed)
  for (const { target, relative, installed } of jobs) {
    console.log(`${installed ? 'Existe   ' : 'Pendiente'}  ${target.id}  ${relative}`)
  }
  if (values.list) {
    console.log(`${pending.length} pendientes de ${jobs.length}`)
    return
  }
  if (values.validate) {
    for (const { relative, path, installed } of jobs) {
      if (!installed) continue
      const { width, height } = await inspectPng(await readFile(path), spriteSize)
      console.log(`Válido  ${relative}  ${width} × ${height} px  alfa comprobado`)
    }
    if (pending.length) throw new Error(`Faltan ${pending.length} PNG de la selección.`)
    return
  }
  const totalEstimate = pending.length * estimatedMicros
  console.log(`${model}  ${quality}  ${size}  Pixel Art  PNG final de ${spriteSize} × ${spriteSize} px`)
  console.log(`${usd(outputEstimateMicros)} de salida por imagen y ${usd(estimatedMicros)} presupuestados con el texto.`)
  console.log(`Estimación del lote de ${pending.length} imágenes  ${usd(totalEstimate)}`)
  console.log(`Tarifas consultadas el ${pricesChecked}  ${pricingUrl}`)
  if (budgetMicros !== undefined && totalEstimate > budgetMicros) {
    throw new Error(`La estimación supera el presupuesto de ${usd(budgetMicros)}.`)
  }
  if (!values.generate || !pending.length) return
  if (budgetMicros === undefined) throw new Error('Indica el límite de gasto del lote con --max-usd.')
  if (!(await authorize())) {
    console.log('Lote cancelado.')
    return
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('Define OPENAI_API_KEY en el entorno de Node.js.')
  let spent = 0
  for (const job of pending) {
    if (spent + estimatedMicros > budgetMicros) {
      throw new Error(`Presupuesto restante insuficiente para ${job.target.id}. Consumo registrado ${usd(spent)}.`)
    }
    let cost
    try {
      cost = await generateSprite(job, apiKey)
    } catch (error) {
      throw new Error(`Se detuvo el lote en ${job.target.id}. ${error.message} Consulta el consumo antes de reintentar.`)
    }
    if (cost === undefined) {
      console.log(`Conservado  ${job.relative}  ya existe`)
      continue
    }
    if (cost === null) throw new Error('OpenAI no informó el uso de tokens. Lote detenido para verificar el consumo.')
    spent += cost
    console.log(`Consumo según tokens devueltos  ${usd(spent)} de ${usd(budgetMicros)}`)
    if (spent > budgetMicros) throw new Error('El consumo informado superó la estimación y el presupuesto del lote.')
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    await run(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
