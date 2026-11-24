import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from './generate-enemy-sprites.mjs'
import { inspectPng } from './enemy-sprite-png.mjs'

const tempBase = resolve(tmpdir())
const raditz = 'src/assets/enemies/goku/raditz/idle.pixel.png'
const zabuza = 'src/assets/enemies/naruto/zabuza/idle.pixel.png'
const usage = { input_tokens: 200, output_tokens: 823 }
let root, sample, fetchImage, authorize

function apiImage(bytes, tokens = usage) {
  return Response.json({ data: [{ b64_json: bytes.toString('base64') }], usage: tokens })
}

beforeAll(async () => {
  const figure = await sharp({
    create: { width: 260, height: 760, channels: 4, background: '#8819cc' },
  }).png().toBuffer()
  sample = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: '#00000000' },
  }).composite([{ input: figure, left: 170, top: 100 }]).png().toBuffer()
})

beforeEach(async () => {
  root = await mkdtemp(join(tempBase, 'enemy-sprite-test-'))
  fetchImage = vi.fn(async () => apiImage(sample))
  authorize = vi.fn(async () => true)
  vi.stubGlobal('fetch', fetchImage)
  vi.stubEnv('OPENAI_API_KEY', 'offline-test-key')
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  if (dirname(root) === tempBase) await rm(root, { recursive: true, force: true })
})

describe('enemy sprite generator', () => {
  it('shows the real pilot destinations and estimated cost without requesting images', async () => {
    await run(['--pilot', '--dry-run', '--max-usd', '0.24'], { root, authorize })
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(raditz))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/assets/enemies/goku/cui/idle.pixel.png'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(zabuza))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/assets/enemies/naruto/mist-ninja/idle.pixel.png'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/assets/heroes/goku/base.pixel.png'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/assets/heroes/goku/ultra-instinct.pixel.png'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/assets/heroes/naruto/base.pixel.png'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/assets/heroes/naruto/baryon.pixel.png'))
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('USD 0.23752'))
    expect(authorize).not.toHaveBeenCalled()
    expect(fetchImage).not.toHaveBeenCalled()
    expect(await readdir(root)).toEqual([])
  })

  it('blocks unknown IDs, an insufficient budget and a declined confirmation before calling OpenAI', async () => {
    await expect(run(['goku-unknown'], { root, authorize })).rejects.toThrow('ID desconocido')
    await expect(run(['--pilot', '--generate'], { root, authorize })).rejects.toThrow('--max-usd')
    await expect(run(['--pilot', '--generate', '--max-usd', '0.11'], { root, authorize })).rejects.toThrow('supera el presupuesto')
    expect(authorize).not.toHaveBeenCalled()
    authorize.mockResolvedValueOnce(false)
    await run(['goku-raditz', '--generate', '--max-usd', '0.03'], { root, authorize })
    expect(authorize).toHaveBeenCalledOnce()
    expect(fetchImage).not.toHaveBeenCalled()
    expect(await readdir(root)).toEqual([])
  })

  it('skips occupied destinations and publishes a normalized transparent PNG for each remaining ID once', async () => {
    const existing = join(root, raditz)
    await mkdir(dirname(existing), { recursive: true })
    await writeFile(existing, sample)
    await run(['goku-raditz', 'naruto-zabuza', 'naruto-zabuza', '--generate', '--max-usd', '0.03'], { root, authorize })

    expect(fetchImage).toHaveBeenCalledOnce()
    const [url, options] = fetchImage.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/images/generations')
    expect(JSON.parse(options.body)).toMatchObject({
      model: 'gpt-image-2.6-sunburst', size: '1024x1024', quality: 'low', n: 1, background: 'transparent',
      output_format: 'png', prompt: expect.stringContaining('Zabuza'),
    })
    expect(await readFile(existing)).toEqual(sample)
    expect(JSON.parse(options.body).prompt).toContain('Strict 2D pixel art')
    const created = await inspectPng(await readFile(join(root, zabuza)), 64)
    expect(created.bounds).toMatchObject({ width: 19, height: 56, top: 6 })
    expect(await readdir(dirname(join(root, zabuza)))).toEqual(['idle.pixel.png'])
  })

  it('rejects a bad image and stops the batch without publishing or retrying', async () => {
    const opaque = await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: '#ffffff' },
    }).png().toBuffer()
    fetchImage.mockImplementationOnce(async () => apiImage(opaque))
    await expect(run(['goku-raditz', 'naruto-zabuza', '--generate', '--max-usd', '0.06'], { root, authorize }))
      .rejects.toThrow('realmente transparente')
    expect(fetchImage).toHaveBeenCalledOnce()
    expect(await readdir(dirname(join(root, raditz)))).toEqual([])
    expect(await readFile(join(root, zabuza)).catch((error) => error.code)).toBe('ENOENT')
  })

  it('generates hero artwork and keeps the legacy Raditz PNG beside its pixel variant', async () => {
    const legacy = join(root, 'src/assets/enemies/goku/raditz/idle.png')
    await mkdir(dirname(legacy), { recursive: true })
    await writeFile(legacy, sample)
    await run(['goku-raditz', 'naruto-baryon', '--generate', '--max-usd', '0.06'], { root, authorize })
    expect(await readFile(legacy)).toEqual(sample)
    expect((await readdir(dirname(legacy))).sort()).toEqual(['idle.pixel.png', 'idle.png'])
    const baryon = join(root, 'src/assets/heroes/naruto/baryon.pixel.png')
    const pixels = await sharp(await readFile(baryon)).ensureAlpha().raw().toBuffer()
    const alpha = new Set(pixels.filter((_, offset) => offset % 4 === 3))
    expect(alpha).toEqual(new Set([0, 255]))
    expect(JSON.parse(fetchImage.mock.calls[1][1].body).prompt).toContain('Naruto Baryon Mode')
  })

  it('lists the five pending destinations and centers a generated item icon', async () => {
    await run(['goku-dodoria', 'goku-piccolo', 'saiyan-armor', 'ki-barrier', 'vitality-orb', '--dry-run', '--max-usd', '0.15'], { root, authorize })
    for (const path of [
      'src/assets/enemies/goku/dodoria/idle.pixel.png', 'src/assets/enemies/goku/piccolo/idle.pixel.png',
      'src/assets/items/png/saiyan-armor.png', 'src/assets/items/png/ki-barrier.png', 'src/assets/items/png/vitality-orb.png',
    ]) expect(console.log).toHaveBeenCalledWith(expect.stringContaining(path))
    expect(fetchImage).not.toHaveBeenCalled()
    await run(['vitality-orb', '--generate', '--max-usd', '0.03'], { root, authorize })
    const icon = await inspectPng(await readFile(join(root, 'src/assets/items/png/vitality-orb.png')), 64)
    expect(icon.bounds.top).toBe(64 - icon.bounds.top - icon.bounds.height)
    expect(JSON.parse(fetchImage.mock.calls[0][1].body).prompt).toContain('Original inventory icon')
  })

  it('uses reported tokens to stop when the next image may exceed the approved budget', async () => {
    fetchImage.mockImplementationOnce(async () => apiImage(sample, { input_tokens: 200, output_tokens: 1100 }))
    await expect(run(['goku-raditz', 'naruto-zabuza', '--generate', '--max-usd', '0.06'], { root, authorize }))
      .rejects.toThrow('Presupuesto restante insuficiente')
    expect(fetchImage).toHaveBeenCalledOnce()
    expect(await readdir(dirname(join(root, raditz)))).toEqual(['idle.pixel.png'])
  })

  it('keeps a sprite added while a request is in flight', async () => {
    fetchImage.mockImplementationOnce(async () => {
      await writeFile(join(root, raditz), sample)
      return apiImage(sample)
    })
    await run(['goku-raditz', '--generate', '--max-usd', '0.03'], { root, authorize })
    expect(await readFile(join(root, raditz))).toEqual(sample)
    expect(await readdir(dirname(join(root, raditz)))).toEqual(['idle.pixel.png'])
  })
})
