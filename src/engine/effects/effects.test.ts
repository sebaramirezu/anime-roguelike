import { describe, expect, it } from 'vitest'
import { advanceEffects, applyEffects } from './effects'
import { calculateSynergies, type SynergyRule } from './synergies'
import { createInventory, placeItem } from '../inventory/inventory'

describe('item effects and synergies', () => {
  it('applies Completo Italiano healing and a 15% cooldown-rate boost for 10 seconds', () => {
    const applied = applyEffects({
      maxHealth: 100,
      health: 50,
      weaponCooldownsMs: [10_000],
      activeEffects: [],
    }, [
      { kind: 'heal', maxHealthPercent: 20 },
      { kind: 'cooldownReduction', percent: 15, durationMs: 10_000 },
    ])

    expect(applied.healed).toBe(20)
    expect(applied.target.health).toBe(70)
    expect(applied.target.activeEffects[0]?.cooldownRateMultiplier).toBe(1.15)
    const advanced = advanceEffects(applied.target, 10_000)
    expect(advanced.weaponCooldownsMs).toEqual([0])
    expect(advanced.activeEffects).toHaveLength(0)
  })

  it('recalculates positional bonuses from base inventory each time', () => {
    let inventory = createInventory()
    inventory = placeItem(inventory, { id: 'swift-gloves', shape: [[0, 0]] }, 'glove-1', [1, 1])
    inventory = placeItem(inventory, { id: 'kunai', shape: [[0, 0]] }, 'weapon-1', [2, 1])
    const items = [
      { ...inventory.items[0], category: 'Guantes' },
      { ...inventory.items[1], category: 'Arma' },
    ]
    const rules: SynergyRule[] = [
      { id: 'gloves-cooldown', kind: 'adjacent', sourceItemId: 'swift-gloves', targetItemId: 'kunai', effect: 'cooldownReduction', value: 8 },
    ]
    expect(calculateSynergies(inventory, items, rules)).toEqual(calculateSynergies(inventory, items, rules))
    expect(calculateSynergies(inventory, items, rules)).toMatchObject([
      { ruleId: 'gloves-cooldown', sourceInstanceId: 'glove-1', targetInstanceId: 'weapon-1', value: 8 },
    ])
  })
})
