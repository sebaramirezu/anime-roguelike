import { describe, expect, it } from 'vitest'
import { advanceCombat, createCombat, getCombatResult } from './combat'

describe('automatic combat', () => {
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
})
