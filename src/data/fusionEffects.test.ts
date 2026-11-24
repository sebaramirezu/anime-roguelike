import { describe, expect, it } from 'vitest'
import { advanceCombat, createCombat, createHeroProgress, createInventory, placeItem, type InventoryState, type ResolvedAttack } from '../engine'
import { playerLoadout } from './combatLoadout'
import { editInventory } from './expeditionInventory'
import { items, type CharacterId } from './items'

const item = (id: string) => items.find((entry) => entry.id === id)!
const enemy = { id: 'target', maxHealth: 20_000, weapons: [] }

function equipped(id: string): InventoryState {
  return placeItem(createInventory(), item(id), 'fusion', [1, 1])
}

function loadout(id: string, bag = equipped(id)) {
  const owner = item(id).owner
  const character = owner === 'shared' ? 'goku' : owner
  return playerLoadout(character, createHeroProgress(character), bag)
}

describe('equipped fusion effects', () => {
  it.each([
    ['reinforced-shield', 0, 0, 320], ['vital-barrier', 0, 0, 150], ['armored-cuirass', 0, 45, 0],
    ['guardian-bracers', 0, 0, 160], ['vital-helmet', 150, 15, 0], ['bastion-armor', 0, 28, 200],
    ['guardian-relic', 0, 0, 400], ['superior-saiyan-armor', 300, 40, 0], ['endurance-vest', 300, 38, 0],
  ] as const)('applies %s defensive bonuses only while the result is equipped', (id, maxHealth, armor, maxShield) => {
    const bag = equipped(id)
    const active = loadout(id, bag)
    expect(active.bonuses).toEqual({ maxHealth, armor, maxShield })
    const combat = createCombat({ player: active.definition, enemy })
    expect(combat.player).toMatchObject({ maxShield, shield: maxShield, armor })
    const moved = editInventory({ bag, tray: [] }, { kind: 'remove', instanceId: 'fusion' })
    if (!moved.ok) throw new Error(moved.error)
    expect(moved.inventory.tray).toHaveLength(1)
    const inactive = loadout(id, moved.inventory.bag)
    expect(inactive.bonuses).toEqual({ maxHealth: 0, armor: 0, maxShield: 0 })
    expect(inactive.definition.supports).toEqual([])
  })

  it('applies the Guardian Bracers cooldown bonus to actual weapon recharge', () => {
    const bag = placeItem(equipped('guardian-bracers'), item('power-pole'), 'staff', [4, 1])
    const { definition } = loadout('guardian-bracers', bag)
    expect(definition.weapons[0].cooldownMs).toBeCloseTo(1104)
    const initial = advanceCombat(createCombat({ player: definition, enemy }), 0)
    const beforeSecondHit = advanceCombat(initial, 1103)
    expect(beforeSecondHit.enemy.health).toBe(enemy.maxHealth - 11)
    expect(advanceCombat(beforeSecondHit, 1).enemy.health).toBe(enemy.maxHealth - 22)
  })

  it.each([
    ['superior-potion', 65, 350, 0, false], ['vital-barrier', 45, 150, 150, true], ['guardian-relic', 40, 200, 400, true],
  ] as const)('uses %s once per combat at its own threshold', (id, threshold, amount, shield, strict) => {
    const player = { ...loadout(id).definition, maxHealth: 1000, initialHealth: threshold * 10 }
    const atLimit = advanceCombat(createCombat({ player, enemy }), 0)
    expect(atLimit.player.health).toBe(player.initialHealth + (strict ? 0 : amount))

    const initialHealth = player.initialHealth - 1
    const source = { ...enemy, weapons: [{ id: 'hit', damage: (amount + shield) / 2, cooldownMs: 1000 }] }
    const initial = createCombat({ player: { ...player, initialHealth }, enemy: source })
    const healings: number[] = []
    const after = advanceCombat(initial, 1000, undefined, (event) => healings.push(event.healed))
    expect(healings).toEqual([amount])
    expect(after.player.health).toBe(initialHealth)
    expect(after.player.shield).toBe(0)
    expect(after.player.supports).toEqual([])
    expect(advanceCombat(after, 0, undefined, (event) => healings.push(event.healed)).player.health).toBe(initialHealth)
    expect(healings).toEqual([amount])
  })

  it.each([
    ['energized-power-pole', 15, 'energy', 9], ['twin-kunai', 11, 'physical', 12],
    ['shadow-kunai', 13, 'clone', 12], ['kyubi-clones', 15, 'clone', 12],
  ] as const)('resolves %s bonus damage as a separate hit through armor and shield', (id, primary, bonusHit, extra) => {
    const { definition } = loadout(id)
    const target = { ...enemy, armor: 100, maxShield: 2 }
    const events: ResolvedAttack[] = []
    const result = advanceCombat(createCombat({ player: definition, enemy: target }), 0, (event) => events.push(event))
    expect(events).toMatchObject([{ damage: primary / 2 - 2, absorbed: 2 }, { damage: extra / 2, bonusHit }])
    expect(result.enemy.health).toBe(enemy.maxHealth - (primary + extra) / 2 + 2)
  })

  it.each([
    ['double-ki-burst', 18, 875], ['empowered-kamehameha', 42, 1260],
  ] as const)('uses the new damage and cadence for %s', (id, damage, cooldownMs) => {
    const { definition } = loadout(id)
    const before = advanceCombat(createCombat({ player: definition, enemy }), cooldownMs - 1)
    expect(before.enemy.health).toBe(enemy.maxHealth - damage)
    expect(advanceCombat(before, 1).enemy.health).toBe(enemy.maxHealth - damage * 2)
  })

  it.each([
    ['kaioken-power-pole', 'power-pole', 22], ['kyubi-rasengan', 'kunai', 27],
  ] as const)('limits the opening damage boost of %s to its own weapon and duration', (id, companion, damage) => {
    const inventory = placeItem(equipped(id), item(companion), 'companion', [4, 1])
    const { definition } = loadout(id, inventory)
    const events: ResolvedAttack[] = []
    const start = createCombat({ player: definition, enemy })
    const first = advanceCombat(start, 0, (event) => events.push(event))
    expect(events.find(({ weaponId }) => weaponId === 'fusion')?.damage).toBeCloseTo(damage * 1.3)
    expect(events.find(({ weaponId }) => weaponId === 'companion')?.damage).toBe(11)
    const later = advanceCombat(first, 12_000, (event) => events.push(event))
    expect(later.player.activeEffects).toHaveLength(0)
    expect(events.findLast(({ weaponId, bonusHit }) => weaponId === 'fusion' && !bonusHit)?.damage).toBe(damage)
  })

  it.each([
    ['ultra-instinct', 'goku', 'power-pole', 35, 35, 12_000], ['baryon-mode', 'naruto', 'kunai', 40, 45, 10_000],
  ] as const)('uses %s as a once-per-battle damage boost when health drops', (id, character, weapon, threshold, boost, durationMs) => {
    const inventory = placeItem(equipped(id), item(weapon), 'companion', [4, 1])
    const { definition } = playerLoadout(character satisfies CharacterId, createHeroProgress(character), inventory)
    const player = { ...definition, maxHealth: 1000, initialHealth: threshold * 10 - 1 }
    const events: ResolvedAttack[] = []
    const first = advanceCombat(createCombat({ player, enemy }), 0, (event) => events.push(event))
    expect(events[0].damage).toBeCloseTo(11 * (1 + boost / 100))
    expect(first.player.activeEffects[0]).toMatchObject({ kind: 'damageBoost', remainingMs: durationMs })
    expect(first.player.supports).toHaveLength(0)
    const after = advanceCombat(first, durationMs + 1200, (event) => events.push(event))
    expect(after.player.activeEffects).toHaveLength(0)
    expect(events.at(-1)?.damage).toBe(11)
  })
})
