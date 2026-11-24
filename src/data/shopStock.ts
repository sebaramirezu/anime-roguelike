import { catalogFor, type CharacterId, type Item } from './items'
import { stagesFor } from './levels'

export const shopRarityWeights = { 1: 40, 2: 35, 3: 20, 4: 4, 5: 1 } as const
export const shopOfferCount = 4
export const legendaryIngredients = {
  goku: ['spirit-bomb', 'focused-spirit-bomb'],
  naruto: ['rasenshuriken', 'kurama-rasenshuriken'],
} as const
const legendaryUnlocks = [{ world: 2, stage: 7 }, { world: 4, stage: 6 }]
type ShopLevel = keyof typeof shopRarityWeights
const levels = Object.keys(shopRarityWeights).map(Number) as ShopLevel[]
const catalogs = { goku: catalogFor('goku'), naruto: catalogFor('naruto') }
const uintRange = 0x100000000

export function legendaryUnlockAt(character: CharacterId, stageIndex: number) {
  const stage = stagesFor(character)[stageIndex]
  return legendaryUnlocks.some(({ world, stage: number }) => stage?.level === world && stage.number === number)
}

export function shopItemEligible(character: CharacterId, item: Item, stageIndex: number) {
  if (item.price === null || item.level === 6 || (item.owner !== 'shared' && item.owner !== character)) return false
  const index = legendaryIngredients[character].findIndex((id) => id === item.id)
  if (index === -1) return true
  const stage = stagesFor(character)[stageIndex]
  const unlock = legendaryUnlocks[index]
  return Boolean(stage && (stage.level > unlock.world || (stage.level === unlock.world && stage.number >= unlock.stage)))
}

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad)
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97)
  return (value ^ (value >>> 15)) >>> 0
}

function stockRandom(seed: number, round: number) {
  let state = mix(seed ^ mix(round))
  return (limit: number) => {
    const boundary = uintRange - (uintRange % limit)
    let value: number
    do {
      state = (state + 0x9e3779b9) >>> 0
      value = mix(state)
    } while (value >= boundary)
    return value % limit
  }
}

function stockBands(character: CharacterId, stageIndex: number) {
  return levels.flatMap((level) => {
    const items = catalogs[character].filter((item) => item.level === level && shopItemEligible(character, item, stageIndex))
    return items.length ? [{ level, items, weight: shopRarityWeights[level] }] : []
  })
}

const bands = {
  goku: stagesFor('goku').map((_, index) => stockBands('goku', index)),
  naruto: stagesFor('naruto').map((_, index) => stockBands('naruto', index)),
}

export function effectiveShopWeights(character: CharacterId, stageIndex: number) {
  const eligible = bands[character][stageIndex] ?? bands[character][0]
  const total = eligible.reduce((sum, { weight }) => sum + weight, 0)
  return Object.fromEntries(levels.map((level) =>
    [level, (eligible.find((band) => band.level === level)?.weight ?? 0) / total]))
}

export function rollShopStock(character: CharacterId, seed: number, round: number, stageIndex: number) {
  const buckets = (bands[character][stageIndex] ?? bands[character][0]).map((band) => ({ ...band, items: [...band.items] }))
  const weight = buckets.reduce((total, bucket) => total + bucket.weight, 0)
  const draw = stockRandom(seed, round)
  // Four equally spaced tickets preserve the configured marginal weights.
  // N5 occupies at most 1% of this range, so at most one ticket can land there.
  const offset = draw(weight)
  const stock = Array.from({ length: shopOfferCount }, (_, index) => {
    let ticket = offset + index * weight
    for (const bucket of buckets) {
      const band = bucket.weight * shopOfferCount
      if (ticket < band) {
        if (!bucket.items.length) throw new Error(`Insufficient distinct items at shop level ${bucket.level}`)
        return bucket.items.splice(draw(bucket.items.length), 1)[0]
      }
      ticket -= band
    }
    throw new Error('Invalid shop weights')
  })
  for (let i = stock.length - 1; i > 0; i--) {
    const j = draw(i + 1)
    const item = stock[j]
    stock[j] = stock[i]
    stock[i] = item
  }
  return stock
}
