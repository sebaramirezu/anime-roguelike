import { advanceCombat, createCombat, getInventoryCells } from '../engine'
import { enemyLoadout, playerLoadout, victoryGold } from './combatLoadout'
import { advanceEquipment, buyOffer, equipmentConfig, offersFor, recordVictory, recoverAfterVictory, refreshOffers, startEquipmentSession, updateEquippedInventory, type EquipmentSession } from './equipmentSession'
import { editInventory } from './expeditionInventory'
import { items, type CharacterId } from './items'
import { stagesFor } from './levels'

const item = (id: string) => items.find((entry) => entry.id === id)!

const purchaseRoutes = {
  control: {
    goku: ['kamehameha', 'ki-barrier', 'spirit-bomb', 'saiyan-armor', 'vitality-orb', 'completo-italiano'],
    naruto: ['rasengan', 'chakra-barrier', 'rasenshuriken', 'chunin-vest', 'vitality-seal', 'completo-italiano', 'protective-helmet'],
  },
  fusion: {
    goku: ['kamehameha', 'ki-barrier', 'spirit-bomb', 'saiyan-armor', 'completo-italiano', 'vitality-orb', 'swift-gloves', 'basic-shield', 'kaioken', 'ki-orbs'],
    naruto: ['rasengan', 'chakra-barrier', 'rasenshuriken', 'chunin-vest', 'completo-italiano', 'vitality-seal', 'swift-gloves', 'basic-shield', 'nine-tails-chakra', 'shadow-clones'],
  },
  defense: {
    goku: ['kamehameha', 'reinforced-armor', 'protective-helmet', 'completo-italiano', 'spirit-bomb', 'ki-barrier', 'saiyan-armor', 'vitality-orb', 'swift-gloves', 'basic-shield'],
    naruto: ['rasengan', 'chakra-barrier', 'rasenshuriken', 'reinforced-armor', 'protective-helmet', 'completo-italiano', 'chunin-vest', 'vitality-seal', 'swift-gloves', 'basic-shield'],
  },
}

export function simulateShopCampaign(character: CharacterId, route: keyof typeof purchaseRoutes = 'control', openingRefreshes = 0) {
  const results = []
  const initial = character === 'goku' ? ['power-pole', 'ki-orbs'] : ['kunai', 'shadow-clones']
  const desired = purchaseRoutes[route][character]
  const stages = stagesFor(character)
  const owned = new Set<string>()
  let session = startEquipmentSession(character, initial.map(item))!
  for (let index = 0; index < openingRefreshes; index++) session = refreshOffers(session)
  function pack(current: EquipmentSession) {
    let inventory = current.inventory
    for (const entry of inventory.tray) {
      let placement: typeof inventory | undefined
      for (const anchor of getInventoryCells(inventory.bag.completedLevels)) {
        const attempt = editInventory(inventory, { kind: 'place', instanceId: entry.id, anchor })
        if (!attempt.ok) continue
        placement ??= attempt.inventory
        if (route === 'control' || attempt.fusion?.placed) {
          placement = attempt.inventory
          break
        }
      }
      if (placement) inventory = placement
    }
    return updateEquippedInventory(current, inventory)
  }
  session = pack(session)
  for (const [index, stage] of stages.entries()) {
    if (index >= 2) {
      const nextItem = desired.find((id) => !owned.has(id))
      const affordableRefreshes = Math.floor((session.gold - (nextItem ? item(nextItem).price ?? 0 : 0)) / equipmentConfig.refreshPrice)
      if (nextItem && affordableRefreshes >= 0) {
        for (let offset = 0; offset <= Math.min(8, affordableRefreshes); offset++) {
          const options = offset === 0 ? session.offers : offersFor(character, session.round + offset)
          const offer = options.find(({ item, sold }) => item.id === nextItem && !sold)
          if (!offer) continue
          for (let refresh = 0; refresh < offset; refresh++) session = refreshOffers(session)
          const purchased = buyOffer(session, offer.id)
          if (purchased !== session) {
            owned.add(nextItem)
            session = pack(purchased)
          }
          break
        }
      }
    }
    const player = playerLoadout(character, session.hero, session.inventory.bag)
    let battle = createCombat({ player: player.definition, enemy: enemyLoadout(stage) })
    let damageDealt = 0
    let damageTaken = 0
    let shieldDealt = 0
    let shieldTaken = 0
    let healed = 0
    let phaseAt: number | undefined
    while (battle.status === 'running') {
      battle = advanceCombat(battle, 100, ({ source, damage, absorbed = 0 }) => {
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
    }
    results.push({
      id: stage.id, world: stage.level, number: stage.number, enemy: stage.enemy.name, kind: stage.enemy.kind,
      level: session.hero.level, seconds: battle.elapsedMs / 1000, outcome: battle.status,
      startingHp: player.health, maxHp: player.definition.maxHealth, hp: battle.player.health, enemyHp: battle.enemy.health, phaseAt,
      armor: player.definition.armor, startingShield: player.definition.maxShield, healed,
      damageDealt, damageTaken, shieldDealt, shieldTaken, items: session.inventory.bag.items.map(({ itemId }) => itemId),
    })
    if (battle.status !== 'victory') break
    session = recordVictory(session, stage, index, { outcome: battle.status, health: battle.player.health, gold: victoryGold(stage) })
    const next = stages[index + 1]
    if (next) session = advanceEquipment(recoverAfterVictory(session), victoryGold(stage), next.level !== stage.level)
  }
  return { stages: results, hero: session.hero }
}
