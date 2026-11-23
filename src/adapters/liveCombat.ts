import { advanceCombat, createCombat, getCombatResult, type CombatantState } from '../engine'
import { items } from '../data/items'
import type { CombatEvent, Combatant, GameEngineAdapter } from './gameEngineAdapter'

const combatTickMs = 100
const catalog = new Map(items.map((item) => [item.id, item]))

function combatantView(state: CombatantState, weaponNames: ReadonlyMap<string, string>): Combatant {
  return {
    health: state.health,
    maxHealth: state.maxHealth,
    weapons: state.weapons.map((weapon) => ({
      id: weapon.id, name: weaponNames.get(weapon.id) ?? 'Ataque',
      remainingSeconds: Math.round(weapon.remainingCooldownMs / 100) / 10,
      totalSeconds: weapon.cooldownMs / 1000,
    })),
  }
}

export const liveCombat: GameEngineAdapter = {
  startCombat({ character, stage, inventory }, publish, signal) {
    if (signal.aborted) return
    const weaponNames = new Map<string, string>()
    const weapons = inventory.items.flatMap(({ instanceId, itemId }) => {
      const item = catalog.get(itemId)
      if (item?.category !== 'Arma') return []
      weaponNames.set(instanceId, item.name)
      return [{ id: instanceId, damage: 5 + item.level * 3, cooldownMs: 1000 + item.level * 200 }]
    })
    const boss = stage.enemy.kind === 'major' ? 3 : stage.enemy.kind === 'minor' ? 2 : 1
    // Provisional encounter parameters. The imported engine resolves every attack and result.
    let state = createCombat({
      player: { id: character, maxHealth: 100, weapons },
      enemy: { id: stage.id, maxHealth: 12 + stage.level * 4 + stage.number * 2 + boss * 6,
        weapons: [{ id: 'enemy-attack', damage: stage.level + boss * 2, cooldownMs: 1600 }] },
      maxDurationMs: 45_000,
    })
    weaponNames.set('enemy-attack', 'Ataque enemigo')
    let recentEvents: CombatEvent[] = []
    let eventId = 0
    let timer: ReturnType<typeof setInterval> | undefined
    function stop() {
      clearInterval(timer)
      signal.removeEventListener('abort', stop)
    }
    function tick() {
      const previous = state
      state = advanceCombat(state, combatTickMs)
      for (const target of ['player', 'enemy'] as const) {
        const amount = previous[target].health - state[target].health
        if (amount > 0) recentEvents = [...recentEvents.slice(-7), {
          id: String(++eventId), kind: 'damage', target, amount,
          text: `${target === 'player' ? 'El campeón' : stage.enemy.name} recibe ${amount} de daño.`,
        }]
      }
      const snapshot = {
        player: combatantView(state.player, weaponNames), enemy: combatantView(state.enemy, weaponNames), recentEvents,
      }
      const result = getCombatResult(state)
      if (!result) {
        publish({ ...snapshot, status: 'running' })
        return
      }
      stop()
      const gold = result.status === 'victory'
        ? stage.total === 12 ? 7 : stage.number === stage.total ? 20 : 0
        : 0
      publish({ ...snapshot, status: 'finished', report: {
        outcome: result.status,
        health: state.player.health, maxHealth: state.player.maxHealth,
        damageDealt: state.enemy.maxHealth - state.enemy.health,
        damageTaken: state.player.maxHealth - state.player.health,
        durationSeconds: state.elapsedMs / 1000, gold,
      } })
    }
    signal.addEventListener('abort', stop, { once: true })
    timer = setInterval(tick, combatTickMs)
    publish({ status: 'running', player: combatantView(state.player, weaponNames), enemy: combatantView(state.enemy, weaponNames) })
  },
}
