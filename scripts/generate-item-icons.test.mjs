import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { expect, it, vi } from 'vitest'
import { itemIconTargets } from '../src/assets/itemIconPaths.ts'
import { inspectPng } from './enemy-sprite-png.mjs'
import { generateItemIcons } from './generate-item-icons.mjs'

it('writes the three registered centered 64px icons locally and preserves existing files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'anime-icons-'))
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  try {
    await generateItemIcons([], { root })
    for (const { path } of itemIconTargets) {
      const bytes = await readFile(join(root, path))
      const { bounds } = await inspectPng(bytes, 64)
      expect(Math.abs(bounds.left + bounds.width / 2 - 32)).toBeLessThanOrEqual(3)
      expect(Math.abs(bounds.top + bounds.height / 2 - 32)).toBeLessThanOrEqual(3)
      const alpha = await sharp(bytes).extractChannel('alpha').raw().toBuffer()
      expect(new Set(alpha)).toEqual(new Set([0, 255]))
    }
    log.mockClear()
    await generateItemIcons([], { root })
    expect(log.mock.calls).toHaveLength(3)
    expect(log.mock.calls.every(([message]) => message.startsWith('Conservado'))).toBe(true)
  } finally {
    log.mockRestore()
    await rm(root, { recursive: true, force: true })
  }
})
