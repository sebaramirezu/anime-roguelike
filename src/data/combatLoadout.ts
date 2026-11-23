import { heroBaseStats, xpForNextLevel, type CombatSupport, type CombatantDefinition, type GameEffect, type HeroProgress, type InventoryState } from '../engine'
import { items, type CharacterId } from './items'
import type { Stage } from './levels'

const catalog = new Map(items.map((item) => [item.id, item]))
const statKeys = { 'vida máxima': 'maxHealth', defensa: 'armor', escudo: 'maxShield' } as const
const enemyBalance = {
  normal: { health: 1, armor: 0, shield: 0, damage: 1 },
  minor: { health: 1.2, armor: 12, shield: 45, damage: 1.08 },
  major: { health: 1.8, armor: 22, shield: 90, damage: 1.15 },
}

export function playerLoadout(character: CharacterId, hero: HeroProgress, inventory: InventoryState) {
  const base = heroBaseStats(character, hero.level)
  const bonuses = { maxHealth: 0, armor: 0, maxShield: 0 }
  const weapons: CombatantDefinition['weapons'][number][] = []
  const supports: CombatSupport[] = []
  const weaponNames = new Map<string, string>()
  const techniqueIds = new Map<string, string>()
  const equipment = inventory.items.flatMap(({ instanceId, itemId }) => {
    const item = catalog.get(itemId)
    return item ? [{ instanceId, item }] : []
  })
  let cooldownReduction = 0
  for (const { instanceId, item } of equipment) {
    const effects: GameEffect[] = []
    for (const effect of item.effects) {
      if (effect.kind === 'statBonus') bonuses[statKeys[effect.stat]] += effect.amount
      if (effect.kind === 'heal') effects.push(effect)
      if (effect.kind === 'weaponCooldownReduction') {
        if (effect.seconds) effects.push({ kind: 'cooldownReduction', percent: effect.percent, durationMs: effect.seconds * 1000, mode: 'duration' })
        else cooldownReduction += effect.percent
      }
    }
    if (effects.length) supports.push({ id: instanceId, name: item.name, threshold: 0.65, effects })
  }
  for (const { instanceId, item } of equipment) {
    if (item.category !== 'Arma') continue
    weaponNames.set(instanceId, item.name)
    techniqueIds.set(instanceId, item.id)
    weapons.push({
      id: instanceId, damage: Math.round((8 + item.level * 3) * base.damageMultiplier * 10) / 10,
      cooldownMs: (1000 + item.level * 200) * (1 - Math.min(40, cooldownReduction) / 100),
    })
  }
  const maxHealth = base.maxHealth + bonuses.maxHealth
  const definition: CombatantDefinition = {
    id: character, maxHealth, armor: bonuses.armor, maxShield: bonuses.maxShield,
    initialHealth: Math.min(maxHealth, hero.health), weapons, supports,
  }
  return {
    definition, weaponNames, techniqueIds, bonuses, health: definition.initialHealth ?? maxHealth,
    level: hero.level, xp: hero.xp, xpNeeded: xpForNextLevel(hero.level), damageMultiplier: base.damageMultiplier,
  }
}

export function enemyLoadout(stage: Stage): CombatantDefinition {
  const rank = enemyBalance[stage.enemy.kind]
  const world = stage.level - 1
  const progress = (stage.number - 1) / (stage.total - 1)
  const healthScale = 1 + world * 0.15 + progress * 0.12
  const damageScale = 2.35 * (1 + world * 0.11 + progress * 0.08) * rank.damage
  return {
    id: stage.enemy.id,
    maxHealth: Math.round((220 + stage.enemy.health * 9) * healthScale * rank.health),
    armor: rank.armor + world * 4 + Math.floor(progress * 5),
    maxShield: Math.round(rank.shield * healthScale),
    weapons: stage.enemy.abilities.map(({ id, damage, cooldownMs }) => ({ id, damage: Math.round(damage * damageScale), cooldownMs })),
  }
}

export function victoryGold(stage: Stage): number {
  if (stage.total === 12) return 7
  return stage.number === stage.total ? 20 : 0
}
