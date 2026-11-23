import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CombatUpdate } from '../adapters/gameEngineAdapter'
import { liveCombat } from '../adapters/liveCombat'
import { enemySpriteRegistry, enemyVisual, eventStyle } from '../components/combat/arenaVisuals'
import { createInventory } from '../engine'
import { allEnemies, enemyRoster } from './enemies'
import { enemyLoadout } from './combatLoadout'
import { levelsFor, stagesFor } from './levels'

const champions = ['goku', 'naruto'] as const
const cases = champions.flatMap((character) => stagesFor(character).map((stage) => ({
  label: `${character}: ${stage.id} / ${stage.enemy.name}`, character, stage,
})))

describe('campaign progression and roster', () => {
  it('keeps 92 assignments and the five major bosses for each campaign in order', () => {
    expect(cases).toHaveLength(92)
    const bosses = {
      goku: ['Piccolo', 'Vegeta', 'Freezer', 'Cell', 'Majin Buu'],
      naruto: ['Zabuza', 'Orochimaru', 'Gaara', 'Itachi', 'Pain'],
    }
    for (const champion of champions) {
      const levels = levelsFor(champion)
      expect(levels.map(({ stages }) => stages.length)).toEqual([12, 12, 5, 12, 5])
      expect(levels.map(({ stages }) => stages.at(-1)?.enemy.name)).toEqual(bosses[champion])
      expect(new Set(stagesFor(champion).map(({ id }) => id)).size).toBe(46)
      expect(new Set(stagesFor(champion).map(({ enemy }) => enemy.id))).toEqual(new Set(
        Object.values(enemyRoster[champion]).flat().map(({ id }) => id),
      ))
    }
    expect(new Set(allEnemies.map(({ id }) => id)).size).toBe(allEnemies.length)
    expect(enemySpriteRegistry.size).toBe(allEnemies.length)
  })

  it('uses Raditz in all 27 normal stages of Goku’s campaign and Piccolo as the first major boss', () => {
    const campaign = stagesFor('goku')
    const normal = campaign.filter(({ enemy }) => enemy.kind === 'normal')
    expect(normal).toHaveLength(27)
    expect(new Set(normal.map(({ enemy }) => enemy.id))).toEqual(new Set(['goku-raditz']))
    expect(campaign[11]).toMatchObject({ level: 1, number: 12, enemy: { id: 'goku-piccolo', kind: 'major' } })
  })

  it('rejects a combat request using the other champion’s campaign', () => {
    expect(() => liveCombat.startCombat({ character: 'naruto', stage: stagesFor('goku')[0], inventory: createInventory() },
      () => {}, new AbortController().signal)).toThrow('no pertenece')
  })
})

describe('all campaign encounters', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each(cases)('$label uses its roster, sprite and real combat moves', ({ character, stage }) => {
    const { enemy, number, total, level } = stage
    const expectedKind = number === total ? 'major' : total === 5 || number === 4 || number === 8 ? 'minor' : 'normal'
    expect(enemy.kind).toBe(expectedKind)
    expect(enemy.character).toBe(character)
    expect(enemyRoster[character][expectedKind]).toContain(enemy)
    const sprite = enemyVisual(stage)
    expect(sprite).toBe(enemySpriteRegistry.get(enemy.id))
    expect(sprite.mark).toBe(enemy.mark)
    expect(sprite.png.idle).toContain(`/assets/enemies/${character}/`)
    expect(Object.keys(sprite.png)).toHaveLength(5)

    const updates: CombatUpdate[] = []
    const controller = new AbortController()
    try {
      liveCombat.startCombat({ character, stage, inventory: createInventory(level - 1) },
        (update) => updates.push(update), controller.signal)
      const definition = enemyLoadout(stage)
      expect(updates[0].enemy?.health).toBe(definition.maxHealth)
      expect(definition.maxHealth).toBeGreaterThan(enemy.health)
      expect(updates[0].enemy?.weapons?.map(({ id, name, totalSeconds }) => [id, name, totalSeconds]))
        .toEqual(enemy.abilities.map(({ id, name, cooldownMs }) => [id, name, cooldownMs / 1000]))

      vi.advanceTimersByTime(100)
      const update = updates.at(-1)!
      const attacks = update.recentEvents?.filter(({ kind, source }) => kind === 'attack' && source === 'enemy') ?? []
      expect(attacks.map(({ techniqueId, text }) => [techniqueId, text]))
        .toEqual(enemy.abilities.map(({ id, name }) => [id, name]))
      expect(attacks.map(eventStyle)).toEqual(enemy.abilities.map(({ theme, special }) => ({ theme, special })))
      expect(update.player?.health).toBe(updates[0].player!.maxHealth! - definition.weapons.reduce((total, { damage }) => total + damage, 0))
    } finally {
      controller.abort()
    }
  })
})
