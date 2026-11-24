import { advanceCombat, createCombat, createHeroProgress, getCombatResult, type CombatantState } from '../engine'
import { enemyLoadout, playerLoadout, victoryGold } from '../data/combatLoadout'
import { heroForms, kyubiChakra } from '../data/heroForms'
import { items } from '../data/items'
import { bossPhaseFor } from '../data/bossPhases'
import { formatCombatAmount } from '../shared/formatCombatAmount'
import { combatStepMs, type CombatEvent, type CombatReport, type Combatant, type GameEngineAdapter } from './gameEngineAdapter'

const itemNames = new Map(items.map(({ id, name }) => [id, name]))
const effectNames = { damageBoost: 'Daño aumentado', cooldownReduction: 'Recarga acelerada', damageReduction: 'Guardia temporal' }
const bonusHits = {
  energy: { name: 'descarga de energía', theme: 'ki' },
  physical: { name: 'golpe adicional', theme: 'blade' },
  clone: { name: 'ataque de clon', theme: 'clones' },
}

function combatantView(state: CombatantState, weaponNames: ReadonlyMap<string, string>): Combatant {
  return {
    health: state.health,
    maxHealth: state.maxHealth,
    shield: state.shield,
    maxShield: state.maxShield,
    stats: { armor: state.armor, damage: state.weapons.reduce((total, weapon) => total + weapon.damage
      + (weapon.bonusHits ?? []).reduce((bonus, hit) => bonus + hit.damage, 0), 0) },
    effects: state.activeEffects.map(({ remainingMs, kind, sourceId }, index) => ({
      id: `${kind}-${index}`, name: effectNames[kind], kind: 'buff',
      remainingSeconds: Math.ceil(remainingMs / 100) / 10, description: sourceId && itemNames.get(sourceId),
    })),
    weapons: state.weapons.map((weapon) => ({
      id: weapon.id, name: weaponNames.get(weapon.id) ?? 'Ataque',
      remainingSeconds: Math.round(weapon.remainingCooldownMs / 100) / 10,
      totalSeconds: weapon.cooldownMs / 1000,
    })),
  }
}

export const liveCombat: GameEngineAdapter = {
  startCombat({ character, stage, inventory, hero = createHeroProgress(character), readSpeed }, publish, signal) {
    if (signal.aborted) return
    if (stage.character !== character) throw new Error('La etapa no pertenece a la campaña del personaje.')
    const player = playerLoadout(character, hero, inventory)
    const formId = heroForms[character]
    const equippedKyubi = character === 'naruto' && inventory.items.some(({ itemId }) => itemId === kyubiChakra)
    let activatedKyubi = false
    const { weaponNames, techniqueIds } = player
    const enemyAbilities = new Map(stage.enemy.abilities.map((ability) => [ability.id, ability]))
    const enemyNames = new Map(stage.enemy.abilities.map(({ id, name }) => [id, name]))
    const phase = bossPhaseFor(stage.enemy)
    const phaseId = `${stage.enemy.id}-phase`
    let state = createCombat({ player: player.definition, enemy: enemyLoadout(stage) })
    const totals = { damageDealt: 0, damageTaken: 0, shieldBlocked: 0, shieldDamageDealt: 0, healing: 0, attacks: 0 }
    const buffs = new Set<string>()
    let bossPhase: CombatReport['bossPhase']
    const activeForm = () => state.player.activeEffects.some(({ sourceId }) => sourceId === formId)
    const snapshotOf = (): { player: Combatant; enemy: Combatant } => ({
      player: {
        ...combatantView(state.player, weaponNames), bonuses: player.bonuses,
        progression: { level: player.level, xp: player.xp, xpNeeded: player.xpNeeded },
        visualForm: activeForm() ? formId : activatedKyubi ? kyubiChakra : undefined,
      },
      enemy: {
        ...combatantView(state.enemy, enemyNames),
        bossPhase: state.enemy.activeEffects.some(({ sourceId }) => sourceId === phaseId) ? phase?.name : undefined,
      },
    })
    let recentEvents: CombatEvent[] = []
    let eventId = 0
    let tickIndex = 0
    let timer: ReturnType<typeof setInterval> | undefined
    function stop() {
      clearInterval(timer)
      signal.removeEventListener('abort', stop)
    }
    function tick() {
      tickIndex++
      const events: CombatEvent[] = []
      let playerAttacked = false
      function record(event: Omit<CombatEvent, 'id' | 'tick'>) {
        events.push({ ...event, id: String(++eventId), tick: tickIndex })
      }
      state = advanceCombat(state, combatStepMs, ({ source, weaponId, damage, absorbed = 0, lethal, critical, bonusHit }) => {
        const target = source === 'player' ? 'enemy' : 'player'
        const ability = source === 'enemy' ? enemyAbilities.get(weaponId) : undefined
        const weaponName = ability?.name ?? weaponNames.get(weaponId) ?? 'Ataque'
        const name = bonusHit ? `${weaponName} · ${bonusHits[bonusHit].name}` : weaponName
        const techniqueId = ability?.id ?? techniqueIds.get(weaponId)
        const visual = bonusHit ? { theme: bonusHits[bonusHit].theme } : ability && { theme: ability.theme, special: ability.special }
        if (source === 'player') {
          playerAttacked = true
          totals.attacks++
          totals.damageDealt += damage
          totals.shieldDamageDealt += absorbed
        } else {
          totals.damageTaken += damage
          totals.shieldBlocked += absorbed
        }
        record({ kind: 'attack', source, target, techniqueId, visual, text: name })
        if (absorbed > 0) record({ kind: 'shield', source, target, techniqueId, amount: absorbed, text: `El escudo absorbe ${formatCombatAmount(absorbed)} de ${name}.` })
        if (damage > 0) record({ kind: 'damage', source, target, techniqueId, amount: damage, critical, text: `${name} inflige ${formatCombatAmount(damage)} de daño a la vida.` })
        if (lethal) record({ kind: 'death', target, text: target === 'enemy' ? `${stage.enemy.name} cae.` : 'El campeón cae.' })
      }, ({ target, name, techniqueId, elapsedMs, healed, buff, damageBoost }) => {
        if (target === 'player') {
          totals.healing += healed
          if (buff) buffs.add(name)
        }
        if (healed > 0) record({ kind: 'heal', target, techniqueId, amount: healed, text: `${name} cura ${formatCombatAmount(healed)} de vida.` })
        if (buff && target === 'enemy' && phase && techniqueId === phaseId) {
          bossPhase = { name, seconds: elapsedMs / 1000 }
          record({ kind: 'transform', source: 'enemy', target, techniqueId, visual: { theme: phase.theme, special: true, bossPhase: true },
            text: `${stage.enemy.name} activa su fase fuerte · ${name}` })
        } else if (buff && target === 'player' && techniqueId === formId) {
          record({ kind: 'transform', source: 'player', target, techniqueId, text: `${name}: transformación activada.` })
        } else if (buff) {
          record({ kind: 'effect', target, techniqueId, text: `${name} ${damageBoost ? 'aumenta el daño' : 'acelera la recarga'}.` })
        }
      })
      if (playerAttacked && equippedKyubi && !activatedKyubi && state.player.health > 0) {
        activatedKyubi = true
        if (!activeForm()) record({ kind: 'transform', source: 'player', target: 'player', techniqueId: kyubiChakra,
          text: `${itemNames.get(kyubiChakra)}: cambio de forma.` })
      }
      if (events.length) {
        const history = [...recentEvents, ...events]
        const firstTick = history[Math.max(0, history.length - 32)].tick
        recentEvents = history.slice(history.findIndex(({ tick }) => tick === firstTick))
      }
      const snapshot = {
        ...snapshotOf(), recentEvents, tick: tickIndex,
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
        ...(phase && { bossPhase, enemyHealth: { current: state.enemy.health, maximum: state.enemy.maxHealth } }),
        durationSeconds: state.elapsedMs / 1000, gold,
      } })
    }
    signal.addEventListener('abort', stop, { once: true })
    const wallStepMs = combatStepMs / 2
    let pendingMs = 0
    timer = setInterval(() => {
      pendingMs += wallStepMs * (readSpeed?.() ?? 1)
      if (pendingMs < combatStepMs) return
      pendingMs -= combatStepMs
      tick()
    }, wallStepMs)
    publish({ status: 'running', tick: 0, ...snapshotOf() })
  },
}
