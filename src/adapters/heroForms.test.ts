import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInventory, placeItem } from '../engine'
import { heroForms } from '../data/heroForms'
import { items, type CharacterId } from '../data/items'
import { stagesFor } from '../data/levels'
import type { CombatUpdate } from './gameEngineAdapter'
import { liveCombat } from './liveCombat'

const item = (id: string) => items.find((entry) => entry.id === id)!

function play(character: CharacterId, withForm: boolean, withWeapon = true) {
  const controller = new AbortController()
  const updates: CombatUpdate[] = []
  let inventory = createInventory()
  if (withWeapon) inventory = placeItem(inventory, item(character === 'goku' ? 'power-pole' : 'kunai'), 'weapon', [1, 1])
  if (withForm) inventory = placeItem(inventory, item(heroForms[character]), 'form', [3, 2])
  liveCombat.startCombat({ character, inventory, stage: stagesFor(character)[0] },
    (update) => updates.push(update), controller.signal)
  return { updates, close: () => controller.abort() }
}

afterEach(() => vi.useRealTimers())

describe('cosmetic forms from resolved attacks', () => {
  it.each(['goku', 'naruto'] as const)('changes %s only after an attack without changing the outcome', (hero) => {
    vi.useFakeTimers()
    const withForm = play(hero, true)
    const base = play(hero, false)
    try {
      expect(withForm.updates[0].player?.visualForm).toBeUndefined()
      vi.advanceTimersByTime(100)
      const first = withForm.updates.at(-1)!
      expect(first.player?.visualForm).toBe(heroForms[hero])
      expect(first.recentEvents?.some(({ kind, source }) => kind === 'attack' && source === 'player')).toBe(true)
      expect(first.recentEvents?.filter(({ kind }) => kind === 'transform')).toMatchObject([{ techniqueId: heroForms[hero] }])
      vi.runAllTimers()
      const after = withForm.updates.at(-1)!
      expect(after.player?.visualForm).toBe(heroForms[hero])
      const auraEvents = withForm.updates.flatMap((update) => update.recentEvents?.filter(({ kind }) => kind === 'transform') ?? [])
      expect(new Set(auraEvents.map(({ id }) => id)).size).toBe(1)
      expect(after).toMatchObject({ status: 'finished', report: { outcome: 'victory' } })
      const baseline = base.updates.at(-1)!
      if (after.status !== 'finished' || baseline.status !== 'finished') throw new Error('Expected both fights to finish')
      expect(after.report).toEqual(baseline.report)
    } finally {
      withForm.close()
      base.close()
    }
  })

  it('does not transform from enemy damage alone', () => {
    vi.useFakeTimers()
    const combat = play('naruto', true, false)
    try {
      vi.advanceTimersByTime(10000)
      expect(combat.updates.at(-1)?.player?.visualForm).toBeUndefined()
    } finally {
      combat.close()
    }
  })
})
