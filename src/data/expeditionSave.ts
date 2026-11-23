import { createInventory, placeItem, type Rotation } from '../engine'
import { offersFor, type EquipmentSession } from './equipmentSession'
import type { UnplacedEntry } from './expeditionInventory'
import { catalogFor, type Cell } from './items'
import { stages } from './levels'

export const expeditionSaveKey = 'anime-roguelike:expedition'
const version = 1

type SavedExpedition = { session: EquipmentSession; stageIndex: number }

export function serializeExpedition({ session, stageIndex }: SavedExpedition): string {
  const { character, gold, round, offers, inventory } = session
  return JSON.stringify({
    version, character, gold, round, stageIndex,
    sold: offers.filter((offer) => offer.sold).map(({ id }) => id),
    tray: inventory.tray.map(({ id, item, rotation }) => ({ id, itemId: item.id, rotation })),
    placed: inventory.bag.items.map(({ instanceId, itemId, anchor, rotation }) => ({ id: instanceId, itemId, anchor, rotation })),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNatural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isCell(value: unknown): value is Cell {
  return Array.isArray(value) && value.length === 2 && value.every(isNatural)
}

function isRotation(value: unknown): value is Rotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

export function restoreExpedition(raw: string | null): SavedExpedition | null {
  if (!raw) return null
  try {
    const saved: unknown = JSON.parse(raw)
    if (!isRecord(saved) || saved.version !== version) return null
    const { character, gold, round, stageIndex, sold, tray, placed } = saved
    if ((character !== 'goku' && character !== 'naruto') || !isNatural(gold) || !isNatural(round)
      || !isNatural(stageIndex) || !stages[stageIndex] || !Array.isArray(sold)
      || !Array.isArray(tray) || !Array.isArray(placed)) return null

    const offers = offersFor(character, round)
    if (new Set(sold).size !== sold.length || !sold.every((id) => offers.some((offer) => offer.id === id))) return null
    const catalog = new Map(catalogFor(character).map((item) => [item.id, item]))
    const seen = new Set<string>()
    function readEntry(value: unknown): UnplacedEntry {
      if (!isRecord(value)) throw new Error('Invalid instance')
      const { id, itemId, rotation } = value
      const item = typeof itemId === 'string' ? catalog.get(itemId) : undefined
      if (typeof id !== 'string' || !id || seen.has(id) || !item || !isRotation(rotation)) throw new Error('Invalid instance')
      seen.add(id)
      return { id, item, rotation }
    }

    const unplaced = tray.map(readEntry)
    let bag = createInventory(stages[stageIndex].level - 1)
    for (const value of placed) {
      if (!isRecord(value) || !isCell(value.anchor)) return null
      const { id, item, rotation } = readEntry(value)
      bag = placeItem(bag, item, id, value.anchor, rotation)
    }
    return {
      stageIndex,
      session: {
        character, gold, round, offers: offers.map((offer) => ({ ...offer, sold: sold.includes(offer.id) })),
        inventory: { bag, tray: unplaced },
      },
    }
  } catch {
    return null
  }
}

export function loadExpedition(): SavedExpedition | null {
  try {
    return restoreExpedition(window.localStorage.getItem(expeditionSaveKey))
  } catch {
    return null
  }
}

export function saveExpedition(session: EquipmentSession | null, stageIndex: number) {
  try {
    if (session) window.localStorage.setItem(expeditionSaveKey, serializeExpedition({ session, stageIndex }))
    else window.localStorage.removeItem(expeditionSaveKey)
    return true
  } catch {
    return false
  }
}
