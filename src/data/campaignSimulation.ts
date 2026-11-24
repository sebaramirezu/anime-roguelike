import { advanceCombat, canPlaceItem, createCombat, getInventoryCells } from '../engine'
import { enemyLoadout, playerLoadout, victoryGold } from './combatLoadout'
import { advanceEquipment, buyOffer, equipmentConfig, recordVictory, recoverAfterVictory, refreshOffers, startEquipmentSession, updateEquippedInventory, type EquipmentSession } from './equipmentSession'
import { editInventory } from './expeditionInventory'
import { fusionRecipes } from './fusionRecipes'
import { items, type CharacterId } from './items'
import { stagesFor, type Stage } from './levels'
import { legendaryIngredients, shopItemEligible } from './shopStock'

const catalog = new Map(items.map((item) => [item.id, item]))
const shoppingLists = {
  goku: ['completo-italiano', 'ki-barrier', 'ki-orbs', 'kamehameha', 'kaioken', 'ki-orbs', 'saiyan-armor',
    'power-pole', 'vitality-orb', 'ki-orbs', 'swift-gloves', 'basic-shield', 'healing-potion', 'protective-helmet',
    'reinforced-armor', 'ki-orbs', 'power-pole', 'kamehameha'],
  naruto: ['completo-italiano', 'chakra-barrier', 'shadow-clones', 'rasengan', 'nine-tails-chakra', 'shadow-clones',
    'chunin-vest', 'kunai', 'vitality-seal', 'shadow-clones', 'swift-gloves', 'basic-shield', 'healing-potion',
    'protective-helmet', 'reinforced-armor', 'shadow-clones', 'kunai', 'rasengan'],
}
const defensive = new Set(['reinforced-armor', 'protective-helmet', 'swift-gloves', 'basic-shield', 'healing-potion'])
type Route = 'control' | 'fusion' | 'defense' | 'mythic' | 'lateMythic'

export function simulateShopCampaign(character: CharacterId, route: Route = 'control', openingRefreshes = 0, shopSeed = 0) {
  const results = []
  const purchases: { id: string; stage: string; price: number }[] = []
  const sightings: { id: string; stage: string; round: number }[] = []
  const fusions: { id: string; level: number; stage: string }[] = []
  const ingredients: readonly string[] = legendaryIngredients[character]
  const initial = character === 'goku' ? ['power-pole', 'ki-orbs'] : ['kunai', 'shadow-clones']
  const desired = [...shoppingLists[character]]
  if (route === 'defense') desired.splice(7, 0, ...desired.splice(10, 5))
  if (route === 'control') desired.splice(8)
  const stages = stagesFor(character)
  let refreshes = 0
  let mythicRefreshes = 0
  let session = startEquipmentSession(character, initial.map((id) => catalog.get(id)!), shopSeed)!
  for (let index = 0; index < openingRefreshes; index++) {
    const updated = refreshOffers(session)
    if (updated !== session) refreshes++
    session = updated
  }
  function pack(current: EquipmentSession, stage: Stage) {
    let { inventory } = current
    for (const entry of inventory.tray) {
      const cells = getInventoryCells(inventory.bag.completedLevels)
      const partner = inventory.bag.items.some(({ itemId }) => fusionRecipes.some(({ ingredients: [a, b] }) =>
        (entry.item.id === a && itemId === b) || (entry.item.id === b && itemId === a)))
      let placement: ReturnType<typeof editInventory> | undefined
      let rotated = inventory
      for (let turn = 0; turn < 4; turn++) {
        const candidate = rotated.tray.find(({ id }) => id === entry.id)!
        for (const anchor of cells) {
          if (!canPlaceItem(rotated.bag, candidate.item, anchor, candidate.rotation)) continue
          const attempt = editInventory(rotated, { kind: 'place', instanceId: entry.id, anchor })
          if (!attempt.ok) continue
          if (!placement || attempt.fusion?.placed) placement = attempt
          if (!partner || attempt.fusion?.placed) break
        }
        if (placement?.ok && (!partner || placement.fusion?.placed)) break
        const turnResult = editInventory(rotated, { kind: 'rotate', instanceId: entry.id })
        if (turnResult.ok) rotated = turnResult.inventory
      }
      if (placement?.ok) {
        inventory = placement.inventory
        if (placement.fusion) fusions.push({ id: placement.fusion.item.id, level: placement.fusion.item.level, stage: stage.id })
      }
    }
    return updateEquippedInventory(current, inventory)
  }
  session = pack(session, stages[0])
  for (const [index, stage] of stages.entries()) {
    function recordStock() {
      for (const { item, sold } of session.offers) {
        if (!sold && ingredients.includes(item.id)) sightings.push({ id: item.id, stage: stage.id, round: session.round })
      }
    }
    recordStock()
    const hunt = (route === 'mythic' || route === 'lateMythic') && (stage.level === 2 || stage.level === 4)
    const possible = stage.level === 2 ? ingredients.slice(0, 1) : ingredients
    const missing = hunt ? possible.filter((id) => !purchases.some((purchase) => purchase.id === id)) : []
    const targets = missing.filter((id) => shopItemEligible(character, catalog.get(id)!, index))
    const reserve = missing.length ? (route === 'lateMythic' && stage.number < stage.total ? 13 : 24) : 0
    let stageRefreshes = 0
    const maxRefreshes = targets.length ? 16 : stage.enemy.kind === 'major' ? 4 : 1
    for (;;) {
      const offer = session.offers.filter(({ item, sold, price }) => !sold && price <= session.gold
        && (targets.includes(item.id) || (desired.includes(item.id) && price <= session.gold - reserve
          && (route !== 'lateMythic' || !hunt || defensive.has(item.id)))))
        .sort((a, b) => {
          const priority = (id: string) => targets.includes(id) ? -1 : desired.indexOf(id)
          return priority(a.item.id) - priority(b.item.id)
        })[0]
      if (offer) {
        const purchased = buyOffer(session, offer.id)
        if (purchased === session) break
        const id = offer.item.id
        purchases.push({ id, stage: stage.id, price: offer.price })
        const goals = targets.includes(id) ? targets : desired
        goals.splice(goals.indexOf(id), 1)
        session = pack(purchased, stage)
        continue
      }
      const reserveForRefresh = targets.length ? 24 : reserve + 6
      if (stageRefreshes >= maxRefreshes || session.gold < reserveForRefresh + equipmentConfig.refreshPrice
        || (!targets.length && (!desired.length || route === 'control')) || (hunt && !targets.length && reserve)) break
      const refreshed = refreshOffers(session)
      if (refreshed === session) break
      session = refreshed
      refreshes++
      stageRefreshes++
      if (targets.length) mythicRefreshes++
      recordStock()
    }
    const player = playerLoadout(character, session.hero, session.inventory.bag)
    let battle = createCombat({ player: player.definition, enemy: enemyLoadout(stage) })
    let damageDealt = 0
    let damageTaken = 0
    let shieldDealt = 0
    let shieldTaken = 0
    let healed = 0
    let phaseAt: number | undefined
    battle = advanceCombat(battle, battle.maxDurationMs, ({ source, damage, absorbed = 0 }) => {
      if (source === 'player') {
        damageDealt += damage
        shieldDealt += absorbed
      } else {
        damageTaken += damage
        shieldTaken += absorbed
      }
    }, ({ target, elapsedMs, healed: amount }) => {
      if (target === 'enemy') phaseAt = elapsedMs / 1000
      else healed += amount
    })
    results.push({
      id: stage.id, world: stage.level, number: stage.number, enemy: stage.enemy.name, kind: stage.enemy.kind,
      level: session.hero.level, seconds: battle.elapsedMs / 1000, outcome: battle.status,
      startingHp: player.health, maxHp: player.definition.maxHealth, hp: battle.player.health, enemyHp: battle.enemy.health, phaseAt,
      armor: player.definition.armor, startingShield: player.definition.maxShield, healed, gold: session.gold,
      damageDealt, damageTaken, shieldDealt, shieldTaken, items: session.inventory.bag.items.map(({ itemId }) => itemId),
    })
    if (battle.status !== 'victory') break
    session = recordVictory(session, stage, index, { outcome: battle.status, health: battle.player.health, gold: victoryGold(stage) })
    const next = stages[index + 1]
    if (next) session = advanceEquipment(recoverAfterVictory(session), victoryGold(stage), next.level !== stage.level)
  }
  return { stages: results, hero: session.hero, purchases, sightings, fusions, refreshes, mythicRefreshes }
}
