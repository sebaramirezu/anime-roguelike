import { describe, expect, it } from 'vitest'
import { advanceCombat, createCombat, getCombatResult } from './combat'

describe('automatic combat', () => {
  it('resolves simultaneous eligible supports at the same instant in both play and simulation', () => {
    const state = advanceCombat(createCombat({
      player: { id: 'p', maxHealth: 100, weapons: [{ id: 'w', damage: 10, cooldownMs: 1000 }], supports: [
        { id: 'heal', name: 'Heal', threshold: 0.75, effects: [{ kind: 'heal', maxHealthPercent: 10 }] },
        { id: 'boost', name: 'Boost', threshold: 0.75, effects: [{ kind: 'damageBoost', percent: 100, durationMs: 500 }] },
      ] },
      enemy: { id: 'e', maxHealth: 200, weapons: [] },
    }), 0)
    const injured = { ...state, player: { ...state.player, health: 40 } }
    const full = advanceCombat(injured, 1000)
    const stepped = Array.from({ length: 10 }).reduce<typeof injured>((battle) => advanceCombat(battle, 100), injured)
    expect(full).toEqual(stepped)
    expect(full.enemy.health).toBe(180)
    expect(full.player.health).toBe(50)
    expect(full.player.activeEffects).toEqual([])
  })

  it('skips other weapons ready at the same instant after a lethal hit', () => {
    const state = createCombat({
      player: { id: 'p', maxHealth: 20, weapons: [
        { id: 'first', damage: 20, cooldownMs: 500 }, { id: 'next', damage: 8, cooldownMs: 700 },
      ] },
      enemy: { id: 'e', maxHealth: 15, weapons: [] },
    })
    const hits: unknown[] = []
    const result = advanceCombat(state, 0, (hit) => hits.push(hit))
    expect(hits).toEqual([{ source: 'player', weaponId: 'first', damage: 15, lethal: true }])
    expect(result.player.weapons[1].remainingCooldownMs).toBe(0)
  })
  it('produces a reproducible victory from automatic weapon attacks', () => {
    const combat = createCombat({
      player: { id: 'goku', maxHealth: 20, weapons: [{ id: 'punch', damage: 7, cooldownMs: 500 }] },
      enemy: { id: 'training-dummy', maxHealth: 12, weapons: [] },
    })

    const result = advanceCombat(combat, 1_000)

    expect(result.status).toBe('victory')
    expect(result.enemy.health).toBe(0)
    expect(result.player.health).toBe(20)
    expect(getCombatResult(result)).toEqual({
      status: 'victory',
      winnerId: 'goku',
      loserId: 'training-dummy',
      elapsedMs: 500,
    })
    expect(combat.enemy.health).toBe(12)
  })

  it('does not attack again before a weapon cooldown expires', () => {
    const combat = createCombat({
      player: { id: 'naruto', maxHealth: 30, weapons: [{ id: 'kunai', damage: 4, cooldownMs: 1_000 }] },
      enemy: { id: 'target', maxHealth: 50, weapons: [] },
    })

    const afterFirstAttack = advanceCombat(combat, 0)
    const beforeCooldown = advanceCombat(afterFirstAttack, 999)
    const cooldownComplete = advanceCombat(beforeCooldown, 1)

    expect(afterFirstAttack.enemy.health).toBe(46)
    expect(beforeCooldown.enemy.health).toBe(46)
    expect(beforeCooldown.player.weapons[0]?.remainingCooldownMs).toBe(1)
    expect(cooldownComplete.enemy.health).toBe(42)
  })

  it('produces defeat when the enemy defeats the player', () => {
    const combat = createCombat({
      player: { id: 'player', maxHealth: 5, weapons: [] },
      enemy: { id: 'enemy', maxHealth: 10, weapons: [{ id: 'strike', damage: 5, cooldownMs: 1_000 }] },
    })

    const result = advanceCombat(combat, 0)

    expect(result.status).toBe('defeat')
    expect(getCombatResult(result)?.winnerId).toBe('enemy')
  })

  it('stops safely when the encounter reaches its time limit', () => {
    const combat = createCombat({
      player: { id: 'player', maxHealth: 10, weapons: [] },
      enemy: { id: 'enemy', maxHealth: 10, weapons: [] },
      maxDurationMs: 200,
    })

    const result = advanceCombat(combat, 1_000)

    expect(result.status).toBe('timeout')
    expect(result.elapsedMs).toBe(200)
    expect(getCombatResult(result)?.winnerId).toBeNull()
  })

  it('applies temporary guard after armor once and spends shield before health without restoring it', () => {
    const combat = createCombat({
      player: {
        id: 'guard', maxHealth: 400, initialHealth: 150, armor: 100, maxShield: 50, weapons: [],
        supports: [{ id: 'form', techniqueId: 'ultra-instinct', name: 'Migatte', threshold: 0.48,
          effects: [{ kind: 'damageReduction', percent: 35, durationMs: 2000 }] }],
      },
      enemy: { id: 'attacker', maxHealth: 400, weapons: [{ id: 'hit', damage: 100, cooldownMs: 1000 }] },
    })
    const hits: unknown[] = []
    const result = advanceCombat(combat, 2000, (hit) => hits.push(hit))
    expect(hits).toMatchObject([{ absorbed: 32.5, damage: 0 }, { absorbed: 17.5, damage: 15 }, { damage: 50 }])
    expect(result.player).toMatchObject({ shield: 0, maxShield: 50, health: 85, activeEffects: [] })
  })
})
