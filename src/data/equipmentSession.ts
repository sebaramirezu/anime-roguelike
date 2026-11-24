import { catalogFor, newDefensiveItems, type CharacterId, type Item } from './items.ts'
import { awardHeroVictory, createHeroProgress, createInventory, rpgBalance, type HeroProgress } from '../engine'
import type { CombatReport } from '../adapters/gameEngineAdapter'
import { playerLoadout } from './combatLoadout'
import type { Stage } from './levels'
import { expandInventory, type ExpeditionInventory } from './expeditionInventory'

export const equipmentConfig = {
  starterCount: 2,
  supplyBudget: 5,
  provisionalGold: 30,
  refreshPrice: 4,
  offerCount: 4,
} as const

export function supplyCost(item: Item): number | null {
  if (item.price === null) return null
  if (item.level === 1) return 2
  if (item.level === 2) return 3
  return null
}

export function selectedSupply(items: readonly Item[]) {
  return items.reduce((total, item) => total + (supplyCost(item) ?? 0), 0)
}

export function validStarterSelection(character: CharacterId, selection: readonly Item[]) {
  const eligible = catalogFor(character).filter((item) => supplyCost(item) !== null)
  return selection.length === equipmentConfig.starterCount
    && new Set(selection.map(({ id }) => id)).size === selection.length
    && selection.every(({ id }) => eligible.some((item) => item.id === id))
    && selectedSupply(selection) <= equipmentConfig.supplyBudget
}

export type Offer = { id: string; item: Item; price: number; sold: boolean }
export type EquipmentSession = {
  character: CharacterId
  gold: number
  round: number
  offers: Offer[]
  inventory: ExpeditionInventory
  hero: HeroProgress
  pendingVictory?: CombatReport
}

export function offersFor(character: CharacterId, round: number, legacy = false): Offer[] {
  const pool = catalogFor(character)
    .filter((item) => item.level < 6 && (!legacy || !newDefensiveItems.has(item.id)))
    .flatMap((item) => item.price === null ? [] : [{ item, price: item.price }])
    .sort((a, b) => Number(b.item.id === 'completo-italiano') - Number(a.item.id === 'completo-italiano'))

  return Array.from({ length: equipmentConfig.offerCount }, (_, slot) => ({
    ...pool[(round * equipmentConfig.offerCount + slot) % pool.length],
    id: `offer-${round}-${slot}`,
    sold: false,
  }))
}

export function startEquipmentSession(character: CharacterId, selection: readonly Item[]): EquipmentSession | null {
  if (!validStarterSelection(character, selection)) return null
  return {
    character,
    gold: equipmentConfig.provisionalGold,
    round: 0,
    hero: createHeroProgress(character),
    offers: offersFor(character, 0),
    inventory: { bag: createInventory(), tray: selection.map((item) => ({ id: `starter-${item.id}`, item, rotation: 0 })) },
  }
}

export function recordVictory(session: EquipmentSession, stage: Stage, stageIndex: number, report: CombatReport): EquipmentSession {
  if (report.outcome !== 'victory' || stageIndex <= session.hero.lastVictory) return session
  const loadout = playerLoadout(session.character, session.hero, session.inventory.bag)
  const { hero, ...reward } = awardHeroVictory(session.character, session.hero, stageIndex, rpgBalance.xp[stage.enemy.kind],
    report.health ?? loadout.health, loadout.definition.maxHealth)
  return { ...session, hero, pendingVictory: { ...report, ...reward } }
}

export function recoverAfterVictory(session: EquipmentSession): EquipmentSession {
  const loadout = playerLoadout(session.character, session.hero, session.inventory.bag)
  const { maxHealth } = loadout.definition
  const { pendingVictory: _completed, ...next } = session
  return { ...next, hero: { ...session.hero, health: Math.min(maxHealth, session.hero.health + maxHealth * rpgBalance.recovery) } }
}

export function updateEquippedInventory(session: EquipmentSession, inventory: ExpeditionInventory): EquipmentSession {
  const loadout = playerLoadout(session.character, session.hero, inventory.bag)
  return { ...session, inventory, hero: { ...session.hero, health: loadout.health } }
}

export function buyOffer(session: EquipmentSession, id: string): EquipmentSession {
  const offer = session.offers.find((entry) => entry.id === id)
  if (session.inventory.bag.combatActive || !offer || offer.sold || offer.item.level === 6 || offer.item.price === null || session.gold < offer.price) return session
  return {
    ...session,
    gold: session.gold - offer.price,
    offers: session.offers.map((entry) => entry.id === id ? { ...entry, sold: true } : entry),
    inventory: { ...session.inventory, tray: [...session.inventory.tray, { id: `purchase-${id}`, item: offer.item, rotation: 0 }] },
  }
}

export function refreshOffers(session: EquipmentSession): EquipmentSession {
  const { refreshPrice } = equipmentConfig
  if (session.inventory.bag.combatActive || session.gold < refreshPrice) return session
  const round = session.round + 1
  return { ...session, round, gold: session.gold - refreshPrice, offers: offersFor(session.character, round) }
}

export function advanceEquipment(session: EquipmentSession, goldEarned: number | undefined, nextLevel: boolean): EquipmentSession {
  if (!nextLevel) return { ...session, gold: session.gold + (goldEarned ?? 0) }

  const round = session.round + 1
  return {
    ...session, gold: 0, round, offers: offersFor(session.character, round),
    inventory: expandInventory(session.inventory, session.inventory.bag.completedLevels + 1),
  }
}
