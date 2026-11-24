import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHeroProgress, createInventory, placeItem } from '../engine'
import { heroForms, kyubiChakra, type HeroForm } from '../data/heroForms'
import { items, type CharacterId } from '../data/items'
import { stagesFor } from '../data/levels'
import type { CombatUpdate } from './gameEngineAdapter'
import { liveCombat } from './liveCombat'

const item = (id: string) => items.find((entry) => entry.id === id)!

function play(character: CharacterId, { form, health, armed = true }: { form?: HeroForm; health?: number; armed?: boolean } = {}) {
  const controller = new AbortController()
  const updates: CombatUpdate[] = []
  let inventory = createInventory()
  if (armed) inventory = placeItem(inventory, item(character === 'goku' ? 'power-pole' : 'kunai'), 'weapon', [1, 1])
  if (form) inventory = placeItem(inventory, item(form), 'form', [3, 2])
  const hero = createHeroProgress(character)
  liveCombat.startCombat({ character, inventory, stage: stagesFor(character)[0], hero: { ...hero, health: health ?? hero.health } },
    (update) => updates.push(update), controller.signal)
  return { updates, close: () => controller.abort() }
}

afterEach(() => vi.useRealTimers())

describe('visual forms from resolved combat', () => {
  it.each([
    ['goku', 620, 11_200, 'Guardia temporal'],
    ['naruto', 585, 7_200, 'Recarga acelerada'],
  ] as const)('shows %s’s mythic form only for the duration of its real effects', (character, health, expireAt, extraEffect) => {
    vi.useFakeTimers()
    const form = heroForms[character]
    const combat = play(character, { form, health })
    try {
      expect(combat.updates[0].player?.visualForm).toBeUndefined()
      vi.advanceTimersByTime(100)
      const active = combat.updates.at(-1)!
      expect(active.player?.visualForm).toBe(form)
      expect(active.recentEvents?.filter(({ kind }) => kind === 'transform')).toMatchObject([{ techniqueId: form }])
      expect(active.player?.effects?.map(({ name }) => name)).toEqual(['Daño aumentado', extraEffect])
      expect(active.player?.effects?.every(({ remainingSeconds }) => (remainingSeconds ?? 0) > 0)).toBe(true)
      vi.advanceTimersByTime(expireAt)
      const expired = combat.updates.at(-1)!
      expect(expired.player?.visualForm).toBeUndefined()
      expect(expired.player?.effects).toEqual([])
      const events = combat.updates.flatMap((update) => update.recentEvents?.filter(({ kind }) => kind === 'transform') ?? [])
      expect(new Set(events.map(({ id }) => id)).size).toBe(1)
    } finally {
      combat.close()
    }
  })

  it('keeps Chakra del Kyubi tied to Naruto’s first resolved attack', () => {
    vi.useFakeTimers()
    const withForm = play('naruto', { form: kyubiChakra })
    const base = play('naruto')
    try {
      expect(withForm.updates[0].player?.visualForm).toBeUndefined()
      vi.advanceTimersByTime(100)
      expect(withForm.updates.at(-1)?.player?.visualForm).toBe(kyubiChakra)
      vi.runAllTimers()
      const after = withForm.updates.at(-1)
      const baseline = base.updates.at(-1)
      expect(after?.player?.visualForm).toBe(kyubiChakra)
      expect(after?.status).toBe('finished')
      if (after?.status === 'finished' && baseline?.status === 'finished') expect(after.report).toEqual(baseline.report)
      else throw new Error('Expected both fights to finish')
    } finally {
      withForm.close()
      base.close()
    }
  })

  it('does not show the cosmetic Kyubi form from enemy damage alone', () => {
    vi.useFakeTimers()
    const combat = play('naruto', { form: kyubiChakra, armed: false })
    try {
      vi.advanceTimersByTime(10000)
      expect(combat.updates.at(-1)?.player?.visualForm).toBeUndefined()
    } finally {
      combat.close()
    }
  })
})
