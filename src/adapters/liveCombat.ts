import { advanceCombat, createCombat, createHeroProgress, getCombatResult, type CombatantState } from '../engine'
import { enemyLoadout, playerLoadout, victoryGold } from '../data/combatLoadout'
import type { CombatEvent, Combatant, GameEngineAdapter } from './gameEngineAdapter'

const combatTickMs = 100

function combatantView(state: CombatantState, weaponNames: ReadonlyMap<string, string>): Combatant {
  return {
    health: state.health,
    maxHealth: state.maxHealth,
    shield: state.shield,
    maxShield: state.maxShield,
    stats: { armor: state.armor, damage: state.weapons.reduce((total, weapon) => total + weapon.damage, 0) },
    effects: state.activeEffects.map(({ remainingMs }, index) => ({
      id: `cooldown-${index}`, name: 'Recarga acelerada', kind: 'buff',
      remainingSeconds: Math.ceil(remainingMs / 100) / 10,
    })),
    weapons: state.weapons.map((weapon) => ({
      id: weapon.id, name: weaponNames.get(weapon.id) ?? 'Ataque',
      remainingSeconds: Math.round(weapon.remainingCooldownMs / 100) / 10,
      totalSeconds: weapon.cooldownMs / 1000,
    })),
  }
}

export const liveCombat: GameEngineAdapter = {
  startCombat({ character, stage, inventory, hero = createHeroProgress(character) }, publish, signal) {
    if (signal.aborted) return
    if (stage.character !== character) throw new Error('La etapa no pertenece a la campaña del personaje.')
    const player = playerLoadout(character, hero, inventory)
    const { weaponNames, techniqueIds } = player
    const enemyAbilities = new Map(stage.enemy.abilities.map((ability) => [ability.id, ability]))
    const enemyNames = new Map(stage.enemy.abilities.map(({ id, name }) => [id, name]))
    let state = createCombat({ player: player.definition, enemy: enemyLoadout(stage) })
    const totals = { damageDealt: 0, damageTaken: 0, shieldBlocked: 0, shieldDamageDealt: 0, healing: 0, attacks: 0 }
    const buffs = new Set<string>()
    const snapshotOf = () => ({
      player: {
        ...combatantView(state.player, weaponNames), bonuses: player.bonuses,
        progression: { level: player.level, xp: player.xp, xpNeeded: player.xpNeeded },
      },
      enemy: combatantView(state.enemy, enemyNames),
    })
    let recentEvents: CombatEvent[] = []
    let eventId = 0
    let timer: ReturnType<typeof setInterval> | undefined
    function stop() {
      clearInterval(timer)
      signal.removeEventListener('abort', stop)
    }
    function tick() {
      const events: CombatEvent[] = []
      function record(event: Omit<CombatEvent, 'id'>) {
        events.push({ ...event, id: String(++eventId) })
      }
      state = advanceCombat(state, combatTickMs, ({ source, weaponId, damage, absorbed = 0, lethal }) => {
        const target = source === 'player' ? 'enemy' : 'player'
        const ability = source === 'enemy' ? enemyAbilities.get(weaponId) : undefined
        const name = ability?.name ?? weaponNames.get(weaponId) ?? 'Ataque'
        const techniqueId = ability?.id ?? techniqueIds.get(weaponId)
        const visual = ability && { theme: ability.theme, special: ability.special }
        if (source === 'player') {
          totals.attacks++
          totals.damageDealt += damage
          totals.shieldDamageDealt += absorbed
        } else {
          totals.damageTaken += damage
          totals.shieldBlocked += absorbed
        }
        record({ kind: 'attack', source, target, techniqueId, visual, text: name })
        if (absorbed > 0) record({ kind: 'shield', source, target, techniqueId, amount: absorbed, text: `El escudo absorbe ${Math.round(absorbed)} de ${name}.` })
        if (damage > 0) record({ kind: 'damage', source, target, techniqueId, amount: damage, text: `${name} inflige ${Math.round(damage)} de daño a la vida.` })
        if (lethal) record({ kind: 'death', target, text: target === 'enemy' ? `${stage.enemy.name} cae.` : 'El campeón cae.' })
      }, ({ target, name, healed, buff }) => {
        if (target === 'player') {
          totals.healing += healed
          if (buff) buffs.add(name)
        }
        if (healed > 0) record({ kind: 'heal', target, amount: healed, text: `${name} cura ${Math.round(healed)} de vida.` })
        if (buff) record({ kind: 'effect', target, text: `${name} acelera la recarga.` })
      })
      if (events.length) recentEvents = [...recentEvents, ...events].slice(-32)
      const snapshot = {
        ...snapshotOf(), recentEvents,
      }
      const result = getCombatResult(state)
      if (!result) {
        publish({ ...snapshot, status: 'running' })
        return
      }
      stop()
      const gold = result.status === 'victory' ? victoryGold(stage) : 0
      publish({ ...snapshot, status: 'finished', report: {
        outcome: result.status,
        health: state.player.health, maxHealth: state.player.maxHealth,
        ...totals, buffs: [...buffs],
        durationSeconds: state.elapsedMs / 1000, gold,
      } })
    }
    signal.addEventListener('abort', stop, { once: true })
    timer = setInterval(tick, combatTickMs)
    publish({ status: 'running', ...snapshotOf() })
  },
}
