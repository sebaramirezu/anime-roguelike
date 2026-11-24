import { describe, expect, it } from 'vitest'
import { simulateShopCampaign } from './campaignSimulation'
import { buyOffer, offersFor, refreshOffers, startEquipmentSession } from './equipmentSession'
import { restoreExpedition, serializeExpedition } from './expeditionSave'
import { heroForms } from './heroForms'
import { items } from './items'
import { stagesFor } from './levels'
import { effectiveShopWeights, legendaryIngredients, rollShopStock, shopRarityWeights } from './shopStock'

const lookup = (id: string) => items.find((item) => item.id === id)!

it('uses one configured distribution for both campaigns', () => {
  expect(shopRarityWeights).toEqual({ 1: 40, 2: 35, 3: 20, 4: 4, 5: 1 })
  for (let stage = 0; stage < 46; stage++) {
    expect(effectiveShopWeights('goku', stage)).toEqual(effectiveShopWeights('naruto', stage))
  }
})

describe.each(['goku', 'naruto'] as const)('%s weighted shop', (character) => {
  const stages = stagesFor(character)
  const [firstId, secondId] = legendaryIngredients[character]
  const starter = () => startEquipmentSession(character, [lookup(character === 'goku' ? 'power-pole' : 'kunai'), lookup('basic-shield')], 31)!

  it('keeps the milestones, excludes level 6 and never offers the two materials together', () => {
    const firstSeen = new Map<string, number>()
    for (const [index, stage] of stages.entries()) {
      for (let seed = 0; seed < 64; seed++) {
        for (let round = 0; round < 8; round++) {
          const stock = rollShopStock(character, seed, round, index)
          expect(new Set(stock.map(({ id }) => id)).size).toBe(4)
          expect(stock.some(({ level, price }) => level === 6 || price === null)).toBe(false)
          const ingredients = stock.filter(({ id }) => id === firstId || id === secondId)
          expect(ingredients.length).toBeLessThanOrEqual(1)
          for (const { id } of ingredients) {
            if (!firstSeen.has(id)) firstSeen.set(id, index)
            expect(stage.level === 1 || (stage.level === 2 && stage.number < 7)).toBe(false)
            if (id === secondId) expect(stage.level < 4 || (stage.level === 4 && stage.number < 6)).toBe(false)
          }
        }
      }
    }
    expect(firstSeen.get(firstId)).toBe(stages.findIndex(({ level, number }) => level === 2 && number === 7))
    expect(firstSeen.get(secondId)).toBe(stages.findIndex(({ level, number }) => level === 4 && number === 6))
  })

  it('matches the marginal weights with and without eligible level 5 stock, with no eight-board guarantee', () => {
    for (const stageIndex of [0, 18, 34]) {
      const counts = [0, 0, 0, 0, 0, 0]
      let dryWindows = 0
      for (let seed = 0; seed < 2048; seed++) {
        let found = false
        for (let round = 0; round < 8; round++) {
          for (const { level } of rollShopStock(character, seed, round, stageIndex)) {
            counts[level]++
            if (level === 5) found = true
          }
        }
        if (!found) dryWindows++
      }
      const weights = effectiveShopWeights(character, stageIndex)
      for (const level of [1, 2, 3, 4, 5]) {
        expect(Math.abs(counts[level] / (2048 * 8 * 4) - weights[level])).toBeLessThan(.005)
      }
      expect(dryWindows).toBeGreaterThan(1000)
    }
  })

  it('keeps old acquired equipment, repairs a pre-unlock offer and persists the seed for future refreshes', () => {
    const session = starter()
    const [slot, ...other] = session.offers
    const item = lookup(secondId)
    const forged = { ...session, offers: [{ ...slot, item, price: item.price! }, ...other],
      inventory: { ...session.inventory, tray: [...session.inventory.tray, { id: 'earlier-purchase', item, rotation: 0 as const }] } }
    expect(buyOffer(forged, slot.id)).toBe(forged)
    const oldSave = JSON.parse(serializeExpedition({ session: forged, stageIndex: 0 }))
    const restored = restoreExpedition(JSON.stringify({ ...oldSave, version: 2, shopSeed: undefined }))!
    expect(restored.session.offers[0].item.id).not.toBe(secondId)
    expect(restored.session.inventory.tray.at(-1)?.item.id).toBe(secondId)
    expect(new Set(restored.session.offers.map(({ item }) => item.id)).size).toBe(4)

    const current = restoreExpedition(serializeExpedition({ session, stageIndex: 0 }))!
    expect(current.session).toEqual(session)
    expect(refreshOffers(current.session).offers).toEqual(offersFor(character, 1, 0, 31))
  })

  it('can craft and equip the mythic from weighted shop purchases during a complete campaign', () => {
    const run = simulateShopCampaign(character, 'mythic', 0, character === 'goku' ? 29 : 3)
    const bought = run.purchases.filter(({ id }) => id === firstId || id === secondId)
    expect(bought.map(({ id, price }) => [id, price])).toEqual([[firstId, 24], [secondId, 24]])
    expect(run.stages.find(({ items }) => items.includes(heroForms[character]))).toBeDefined()
    expect(run.stages.at(-1)).toMatchObject({ id: 'level-5-stage-5', outcome: 'victory' })
  })
})
