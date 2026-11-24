import { describe, expect, it } from 'vitest'
import { canFuse, findFusionResult, fuseItems, type FusionItemDefinition, type FusionRecipe } from './fusion'
import { createInventory, placeItem } from '../inventory/inventory'

describe('recipe-based fusion', () => {
  const items: FusionItemDefinition[] = [
    { id: 'spirit-bomb', level: 5, shape: [[0, 0]] },
    { id: 'focused-spirit-bomb', level: 5, shape: [[0, 0]] },
    { id: 'ultra-instinct', level: 6, shape: [[0, 0]] },
  ]
  const recipes: FusionRecipe[] = [{ ingredients: ['spirit-bomb', 'focused-spirit-bomb'], result: 'ultra-instinct' }]

  it('consumes both recipe ingredients and creates one new result instance', () => {
    let inventory = createInventory()
    inventory = placeItem(inventory, items[0]!, 'bomb-a', [1, 1])
    inventory = placeItem(inventory, items[1]!, 'bomb-b', [2, 1])
    const request = { firstInstanceId: 'bomb-a', secondInstanceId: 'bomb-b', resultInstanceId: 'ultimate-a' }
    expect(canFuse(inventory, items, recipes, request)).toBe(true)
    const fused = fuseItems(inventory, items, recipes, request)
    expect(fused.items.map(({ instanceId, itemId }) => [instanceId, itemId])).toEqual([['ultimate-a', 'ultra-instinct']])
    expect(canFuse(fused, items, recipes, request)).toBe(false)
  })

  it('rejects arbitrary or non-level-5 combinations', () => {
    let inventory = createInventory()
    inventory = placeItem(inventory, items[0]!, 'bomb-a', [1, 1])
    inventory = placeItem(inventory, items[2]!, 'ultimate-a', [2, 1])
    expect(canFuse(inventory, items, recipes, {
      firstInstanceId: 'bomb-a', secondInstanceId: 'ultimate-a', resultInstanceId: 'result',
    })).toBe(false)
  })

  it('matches repeated ingredients as two distinct instances', () => {
    const potion = { id: 'potion', level: 1, shape: [[0, 0]] as const }
    const tonic = { ...potion, id: 'tonic', level: 2 }
    const shield = { ...potion, id: 'shield' }
    const definitions = [potion, tonic, shield]
    const repeated: FusionRecipe[] = [{ ingredients: ['potion', 'potion'], result: 'tonic' }]
    const inventory = placeItem(placeItem(createInventory(), potion, 'first', [1, 1]), potion, 'second', [1, 2])
    const request = { firstInstanceId: 'first', secondInstanceId: 'second', resultInstanceId: 'result' }
    expect(canFuse(inventory, definitions, repeated, { ...request, secondInstanceId: 'first' })).toBe(false)
    expect(findFusionResult(definitions, repeated, 'potion', 'shield')).toBeUndefined()
    expect(fuseItems(inventory, definitions, repeated, request).items.map(({ itemId }) => itemId)).toEqual(['tonic'])
  })

  it('rejects explicitly incompatible universes', () => {
    const definitions = [
      { ...items[0], owner: 'goku' },
      { ...items[1], owner: 'naruto' },
      { ...items[2], owner: 'goku' },
    ]
    expect(findFusionResult(definitions, recipes, items[0].id, items[1].id)).toBeUndefined()
  })

  it('allows only distinct level-5 ingredients for a level-6 result and never consumes level 6', () => {
    const [first, second, ultimate] = items
    const lower = { ...first, id: 'lower', level: 4 }
    expect(findFusionResult(items, recipes, second.id, first.id)).toBe(ultimate)
    expect(findFusionResult([...items, lower], [{ ingredients: [lower.id, second.id], result: ultimate.id }],
      lower.id, second.id)).toBeUndefined()
    expect(findFusionResult(items, [{ ingredients: [first.id, first.id], result: ultimate.id }],
      first.id, first.id)).toBeUndefined()
    expect(findFusionResult([...items, lower], [{ ingredients: [first.id, ultimate.id], result: lower.id }],
      first.id, ultimate.id)).toBeUndefined()
  })
})
