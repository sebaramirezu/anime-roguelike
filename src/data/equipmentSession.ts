import { catalogFor, type CharacterId, type Item } from './items.ts'
import { createInventory } from '../engine'
import { expandInventory, type ExpeditionInventory } from './expeditionInventory'

export const equipmentConfig = {
  starterCount: 2,
  supplyBudget: 5,
  provisionalGold: 30,
  refreshPrice: 4,
  offerCount: 4,
} as const

export function supplyCost(item: Item): number | null {
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
}

export function offersFor(character: CharacterId, round: number): Offer[] {
  const pool = catalogFor(character)
    .filter((item) => item.level < 6)
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
    offers: offersFor(character, 0),
    inventory: { bag: createInventory(), tray: selection.map((item) => ({ id: `starter-${item.id}`, item, rotation: 0 })) },
  }
}

export function buyOffer(session: EquipmentSession, id: string): EquipmentSession {
  const offer = session.offers.find((entry) => entry.id === id)
  if (session.inventory.bag.combatActive || !offer || offer.sold || offer.item.level === 6 || session.gold < offer.price) return session
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
