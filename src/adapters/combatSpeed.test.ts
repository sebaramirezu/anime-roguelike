import { expect, it, vi } from 'vitest'
import { canPlaceItem, createHeroProgress, createInventory, getInventoryCells, placeItem } from '../engine'
import { items } from '../data/items'
import { stagesFor } from '../data/levels'
import type { CombatSpeed, CombatUpdate } from './gameEngineAdapter'
import { liveCombat } from './liveCombat'

it('keeps each combat snapshot and resolved effect identical at ×1, ×2, and after switching mid-fight', () => {
  vi.useFakeTimers()
  const stage = stagesFor('goku').find(({ enemy }) => enemy.id === 'goku-cell')!
  const worldCells = getInventoryCells(stage.level - 1)
  const inventory = ['ultra-instinct', 'superior-saiyan-armor', 'ki-barrier', 'completo-italiano',
    'guardian-bracers', 'kamehameha'].reduce((bag, id) => {
    const item = items.find((entry) => entry.id === id)!
    const anchor = worldCells.find((cell) => canPlaceItem(bag, item, cell))!
    return placeItem(bag, item, id, anchor)
  }, createInventory(stage.level - 1))
  function play(initial: CombatSpeed, varied = false) {
    const controller = new AbortController()
    const updates: CombatUpdate[] = []
    const start = Date.now()
    let finishedAt = start
    let speed = initial
    liveCombat.startCombat({
      character: 'goku', stage, inventory, hero: { ...createHeroProgress('goku'), level: 7, health: 1450 },
      readSpeed: () => speed,
    }, (update) => {
      updates.push(update)
      if (update.status === 'finished') finishedAt = Date.now()
    }, controller.signal)
    if (varied) {
      vi.advanceTimersByTime(4850)
      speed = 2
      vi.advanceTimersByTime(5300)
      speed = 1
    }
    vi.runAllTimers()
    controller.abort()
    return { updates, wallMs: finishedAt - start }
  }
  try {
    const normal = play(1)
    const fast = play(2)
    const mixed = play(1, true)
    expect(fast.updates).toEqual(normal.updates)
    expect(mixed.updates).toEqual(normal.updates)
    expect(normal.updates.at(-1)?.status).toBe('finished')
    expect(fast.wallMs * 2).toBe(normal.wallMs)
    expect(mixed.wallMs).toBeGreaterThan(fast.wallMs)
    expect(mixed.wallMs).toBeLessThan(normal.wallMs)
    const transformations = new Map(normal.updates.flatMap(({ recentEvents = [] }) =>
      recentEvents.filter(({ kind }) => kind === 'transform').map((event) => [event.id, event.techniqueId])))
    expect([...transformations.values()].sort()).toEqual(['goku-cell-phase', 'ultra-instinct'])
  } finally {
    vi.useRealTimers()
  }
})
