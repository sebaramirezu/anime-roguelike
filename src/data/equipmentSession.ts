import { catalogFor, type CharacterId, type Item } from './items.ts'
import { awardHeroVictory, createHeroProgress, createInventory, rpgBalance, type HeroProgress } from '../engine'
import type { CombatReport } from '../adapters/gameEngineAdapter'
import { playerLoadout } from './combatLoadout'
import type { Stage } from './levels'
import { expandInventory, type ExpeditionInventory } from './expeditionInventory'
import { legendaryUnlockAt, rollShopStock, shopItemEligible, shopOfferCount } from './shopStock'

export const equipmentConfig = {
  starterCount: 2,
  supplyBudget: 5,
  provisionalGold: 30,
  refreshPrice: 4,
  offerCount: shopOfferCount,
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
  shopSeed: number
  offers: Offer[]
  inventory: ExpeditionInventory
  hero: HeroProgress
  pendingVictory?: CombatReport
}

export function repairShopOffers(character: CharacterId, stageIndex: number, offers: Offer[], replacements: Offer[]): Offer[] {
  const regular = [...replacements.map(({ item }) => item), ...catalogFor(character)]
    .filter((item) => item.level < 5 && shopItemEligible(character, item, stageIndex))
  const reserved = new Set(offers.map(({ item }) => item.id))
  let legendarySlotUsed = false
  return offers.map((offer) => {
    if (shopItemEligible(character, offer.item, stageIndex) && (offer.item.level !== 5 || !legendarySlotUsed)) {
      if (offer.item.level === 5) legendarySlotUsed = true
      return offer
    }
    const item = regular.find((candidate) => !reserved.has(candidate.id))!
    reserved.add(item.id)
    return { ...offer, item, price: item.price! }
  })
}

export function offersFor(character: CharacterId, round: number, stageIndex = 0, shopSeed = 0): Offer[] {
  return rollShopStock(character, shopSeed, round, stageIndex).map((item, slot) => ({
    item, price: item.price!,
    id: `offer-${round}-${slot}`,
    sold: false,
  }))
}

export function startEquipmentSession(character: CharacterId, selection: readonly Item[], shopSeed = crypto.getRandomValues(new Uint32Array(1))[0]): EquipmentSession | null {
  if (!validStarterSelection(character, selection)) return null
  return {
    character,
    gold: equipmentConfig.provisionalGold,
    round: 0,
    shopSeed,
    hero: createHeroProgress(character),
    offers: offersFor(character, 0, 0, shopSeed),
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
  if (session.inventory.bag.combatActive || session.pendingVictory || !offer || offer.sold || session.gold < offer.price
    || !shopItemEligible(session.character, offer.item, session.hero.lastVictory + 1)) return session
  return {
    ...session,
    gold: session.gold - offer.price,
    offers: session.offers.map((entry) => entry.id === id ? { ...entry, sold: true } : entry),
    inventory: { ...session.inventory, tray: [...session.inventory.tray, { id: `purchase-${id}`, item: offer.item, rotation: 0 }] },
  }
}

export function refreshOffers(session: EquipmentSession): EquipmentSession {
  const { refreshPrice } = equipmentConfig
  if (session.inventory.bag.combatActive || session.pendingVictory || session.gold < refreshPrice) return session
  const round = session.round + 1
  return { ...session, round, gold: session.gold - refreshPrice,
    offers: offersFor(session.character, round, session.hero.lastVictory + 1, session.shopSeed) }
}

export function advanceEquipment(session: EquipmentSession, goldEarned: number | undefined, nextLevel: boolean): EquipmentSession {
  const stageIndex = session.hero.lastVictory + 1
  if (!nextLevel) {
    const gold = session.gold + (goldEarned ?? 0)
    if (legendaryUnlockAt(session.character, stageIndex)) {
      const round = session.round + 1
      return { ...session, gold, round, offers: offersFor(session.character, round, stageIndex, session.shopSeed) }
    }
    return { ...session, gold }
  }
  const round = session.round + 1
  return {
    ...session, gold: 0, round, offers: offersFor(session.character, round, stageIndex, session.shopSeed),
    inventory: expandInventory(session.inventory, session.inventory.bag.completedLevels + 1),
  }
}
