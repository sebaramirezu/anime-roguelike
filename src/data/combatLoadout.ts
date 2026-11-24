import { heroBaseStats, xpForNextLevel, type CombatSupport, type CombatantDefinition, type GameEffect, type HeroProgress, type InventoryState } from '../engine'
import { items, type CharacterId, type Item } from './items'
import { fusionRecipes } from './fusionRecipes'
import { heroForms } from './heroForms'
import { bossPhaseFor, bossPhaseSupport } from './bossPhases'
import type { Stage } from './levels'

const catalog = new Map(items.map((item) => [item.id, item]))
const statKeys = { 'vida máxima': 'maxHealth', defensa: 'armor', escudo: 'maxShield' } as const
const enemyBalance = {
  normal: { health: 1, healthPerWorld: 0.23, damagePerWorld: 0.095, armor: 0, shield: 0 },
  minor: { health: 1.27, healthPerWorld: 0.23, damagePerWorld: 0.095, armor: 12, shield: 45 },
  major: { health: 2.1, healthPerWorld: 0.16, damagePerWorld: 0.055, armor: 22, shield: 90 },
}
const majorHealthByWorld = [1.28, 1.25, 1.10]

function encounterHealthMultiplier(stage: Stage): number {
  const world = stage.level - 1
  const progress = (stage.number - 1) / (stage.total - 1)
  if (stage.enemy.kind === 'normal') {
    // The first two fights precede the first offensive shop upgrade in the campaign simulation.
    const afterOpening = Math.max(0, stage.number - 2)
    return world === 0
      ? 1 + Math.min(1, afterOpening) * 0.30 + afterOpening * 0.18
      : 2.75 + world * 0.20 + progress * 0.21
  }
  if (stage.enemy.kind === 'minor') return world === 0 ? 1.08 + progress * 0.74 : 1.42
  return majorHealthByWorld[world] ?? 1
}

export function playerLoadout(character: CharacterId, hero: HeroProgress, inventory: InventoryState) {
  const base = heroBaseStats(character, hero.level)
  const bonuses = { maxHealth: 0, armor: 0, maxShield: 0 }
  const weapons: CombatantDefinition['weapons'][number][] = []
  const supports: CombatSupport[] = []
  const openingEffects: NonNullable<CombatantDefinition['openingEffects']>[number][] = []
  const weaponNames = new Map<string, string>()
  const techniqueIds = new Map<string, string>()
  const equipment = inventory.items.flatMap(({ instanceId, itemId }) => {
    const item = catalog.get(itemId)
    return item && (item.owner === character || item.owner === 'shared') ? [{ instanceId, item }] : []
  })
  let cooldownReduction = 0
  for (const { instanceId, item } of equipment) {
    const effects: GameEffect[] = []
    let belowHealthPercent: number | undefined
    for (const effect of item.effects) {
      if (effect.kind === 'statBonus') bonuses[statKeys[effect.stat]] += effect.amount
      if (effect.kind === 'heal') {
        effects.push({ kind: 'heal', maxHealthPercent: effect.maxHealthPercent })
        belowHealthPercent = effect.belowHealthPercent
      }
      if (effect.kind === 'weaponCooldownReduction') {
        if (effect.seconds) {
          effects.push({ kind: 'cooldownReduction', percent: effect.percent, durationMs: effect.seconds * 1000, mode: 'duration' })
          belowHealthPercent = effect.belowHealthPercent ?? belowHealthPercent
        } else cooldownReduction += effect.percent
      }
      if (effect.kind === 'damageBoost') {
        const boost = { kind: 'damageBoost' as const, percent: effect.percent, durationMs: effect.seconds * 1000 }
        if (effect.belowHealthPercent === undefined) openingEffects.push({ ...boost, weaponId: instanceId })
        else {
          effects.push(boost)
          belowHealthPercent = effect.belowHealthPercent
        }
      }
      if (effect.kind === 'damageReduction') {
        effects.push({ kind: 'damageReduction', percent: effect.percent, durationMs: effect.seconds * 1000 })
        belowHealthPercent = effect.belowHealthPercent
      }
    }
    if (effects.length && (item.id !== heroForms[character] || !supports.some(({ techniqueId }) => techniqueId === item.id))) {
      supports.push({ id: instanceId, techniqueId: item.id, name: item.name, threshold: (belowHealthPercent ?? 65) / 100,
        strictThreshold: belowHealthPercent !== undefined, effects })
    }
  }
  const scaledDamage = (damage: number) => Math.round(damage * base.damageMultiplier * 10) / 10
  function addWeapon(instanceId: string, item: Item) {
    weaponNames.set(instanceId, item.name)
    techniqueIds.set(instanceId, item.id)
    const profile = item.effects.find((effect) => effect.kind === 'weaponProfile')
    weapons.push({
      id: instanceId,
      damage: scaledDamage(profile?.damage ?? 8 + item.level * 3),
      cooldownMs: (profile?.cooldownMs ?? 1000 + item.level * 200) * (1 - Math.min(40, cooldownReduction) / 100),
      ...(profile?.bonusHits && { bonusHits: profile.bonusHits.map((hit) => ({ ...hit, damage: scaledDamage(hit.damage) })) }),
    })
  }
  const inherited = new Set<string>()
  for (const { instanceId, item } of equipment) {
    if (item.category === 'Arma') addWeapon(instanceId, item)
    if (!item.effects.some(({ kind }) => kind === 'inheritWeapons') || inherited.has(item.id)) continue
    inherited.add(item.id)
    const recipe = fusionRecipes.find(({ result }) => result === item.id)
    for (const id of recipe?.ingredients ?? []) {
      const ingredient = catalog.get(id)
      if (ingredient?.category === 'Arma') addWeapon(`${instanceId}:${id}`, ingredient)
    }
  }
  const maxHealth = base.maxHealth + bonuses.maxHealth
  const definition: CombatantDefinition = {
    id: character, maxHealth, armor: bonuses.armor, maxShield: bonuses.maxShield,
    initialHealth: Math.min(maxHealth, hero.health), weapons, supports, openingEffects,
  }
  return {
    definition, equipment, weaponNames, techniqueIds, bonuses, health: definition.initialHealth ?? maxHealth,
    level: hero.level, xp: hero.xp, xpNeeded: xpForNextLevel(hero.level), damageMultiplier: base.damageMultiplier,
  }
}

export function enemyLoadout(stage: Stage): CombatantDefinition {
  const rank = enemyBalance[stage.enemy.kind]
  const world = stage.level - 1
  const progress = (stage.number - 1) / (stage.total - 1)
  const healthScale = 1 + world * rank.healthPerWorld + progress * 0.12
  const damageScale = 1 + world * rank.damagePerWorld + progress * 0.045
  const phase = bossPhaseSupport(stage.enemy)
  return {
    id: stage.enemy.id,
    maxHealth: Math.round((420 + stage.enemy.health * 13) * rank.health
      * (stage.enemy.kind === 'normal' ? 1 : healthScale) * encounterHealthMultiplier(stage)),
    armor: rank.armor + world * 4 + Math.floor(progress * 5) + (stage.enemy.kind === 'minor' ? world * 2 : 0),
    maxShield: Math.round(rank.shield * healthScale) + (stage.enemy.kind === 'minor' ? world * 12 : 0) + (bossPhaseFor(stage.enemy)?.shield ?? 0),
    ...(phase && { supports: [phase] }),
    weapons: stage.enemy.abilities.map(({ id, damage, cooldownMs }) => ({ id, damage: Math.round(damage * damageScale), cooldownMs })),
  }
}

export function victoryGold(stage: Stage): number {
  if (stage.total === 12) return 7
  return stage.number === stage.total ? 20 : 0
}
