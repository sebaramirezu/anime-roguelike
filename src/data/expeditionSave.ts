import { awardHeroVictory, createHeroProgress, createInventory, placeItem, rpgBalance, xpForNextLevel, type HeroProgress, type Rotation } from '../engine'
import type { CombatReport } from '../adapters/gameEngineAdapter'
import { playerLoadout } from './combatLoadout'
import { offersFor, type EquipmentSession } from './equipmentSession'
import type { UnplacedEntry } from './expeditionInventory'
import { catalogFor, type Cell } from './items'
import { stagesFor } from './levels'

export const expeditionSaveKey = 'anime-roguelike:expedition'
const version = 2

type SavedExpedition = { session: EquipmentSession; stageIndex: number }

export function serializeExpedition({ session, stageIndex }: SavedExpedition): string {
  const { character, gold, round, offers, inventory } = session
  return JSON.stringify({
    version, character, gold, round, stageIndex, hero: session.hero, pendingVictory: session.pendingVictory,
    offerItems: offers.map(({ item }) => item.id),
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

function readHero(value: unknown, stageIndex: number): HeroProgress | null {
  if (!isRecord(value)) return null
  const { level, xp, health, lastVictory } = value
  if (!isNatural(level) || level < 1 || level > 46 || !isNatural(xp) || xp >= xpForNextLevel(level)
    || typeof health !== 'number' || !Number.isFinite(health) || health < 0
    || typeof lastVictory !== 'number' || !Number.isInteger(lastVictory) || lastVictory < -1 || lastVictory > stageIndex) return null
  return { level, xp, health, lastVictory }
}

function readVictory(value: unknown): CombatReport | undefined {
  if (!isRecord(value) || value.outcome !== 'victory') return undefined
  const report: CombatReport = { outcome: 'victory' }
  for (const key of ['health', 'maxHealth', 'damageDealt', 'damageTaken', 'healing', 'lifestealHealing',
    'shieldBlocked', 'shieldDamageDealt', 'thornsDamage', 'attacks', 'criticals', 'durationSeconds', 'gold',
    'xpGained', 'levelsGained', 'healthIncrease', 'damageIncrease'] as const) {
    const amount = value[key]
    if (amount !== undefined) {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return undefined
      report[key] = amount
    }
  }
  for (const key of ['buffs', 'debuffs'] as const) {
    const labels = value[key]
    if (labels !== undefined) {
      if (!Array.isArray(labels) || !labels.every((label) => typeof label === 'string')) return undefined
      report[key] = labels
    }
  }
  return report
}

export function restoreExpedition(raw: string | null): SavedExpedition | null {
  if (!raw) return null
  try {
    const saved: unknown = JSON.parse(raw)
    if (!isRecord(saved) || (saved.version !== version && saved.version !== 1)) return null
    const { character, gold, round, stageIndex, sold, tray, placed } = saved
    if ((character !== 'goku' && character !== 'naruto') || !isNatural(gold) || !isNatural(round)
      || !isNatural(stageIndex) || !Array.isArray(sold)
      || !Array.isArray(tray) || !Array.isArray(placed)) return null

    const stages = stagesFor(character)
    const stage = stages[stageIndex]
    if (!stage) return null
    const legacy = saved.version === 1
    const catalog = new Map(catalogFor(character).map((item) => [item.id, item]))
    let offers = offersFor(character, round, legacy)
    if (!legacy) {
      const offerItems = saved.offerItems
      if (!Array.isArray(offerItems) || offerItems.length !== offers.length || new Set(offerItems).size !== offerItems.length) return null
      offers = offers.map((offer, index) => {
        const item = catalog.get(offerItems[index])
        if (!item || item.level === 6 || item.price === null) throw new Error('Invalid shop item')
        return { ...offer, item, price: item.price }
      })
    }
    if (new Set(sold).size !== sold.length || !sold.every((id) => offers.some((offer) => offer.id === id))) return null
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
    let bag = createInventory(stage.level - 1)
    for (const value of placed) {
      if (!isRecord(value) || !isCell(value.anchor)) return null
      const { id, item, rotation } = readEntry(value)
      bag = placeItem(bag, item, id, value.anchor, rotation)
    }
    let hero = legacy ? createHeroProgress(character) : readHero(saved.hero, stageIndex)
    if (!hero) return null
    const pendingVictory = readVictory(saved.pendingVictory)
    if ((pendingVictory && hero.lastVictory !== stageIndex) ||
      (!pendingVictory && (hero.lastVictory === stageIndex || saved.pendingVictory !== undefined))) return null
    if (legacy) {
      for (let index = 0; index < stageIndex; index++) {
        hero = awardHeroVictory(character, hero, index, rpgBalance.xp[stages[index].enemy.kind],
          hero.health, playerLoadout(character, hero, bag).definition.maxHealth).hero
      }
      hero = { ...hero, health: playerLoadout(character, hero, bag).definition.maxHealth }
    }
    const maxHealth = playerLoadout(character, hero, bag).definition.maxHealth
    if (hero.health > maxHealth) hero = { ...hero, health: maxHealth }
    return {
      stageIndex,
      session: {
        character, gold, round, offers: offers.map((offer) => ({ ...offer, sold: sold.includes(offer.id) })),
        inventory: { bag, tray: unplaced },
        hero,
        ...(pendingVictory ? { pendingVictory } : {}),
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
