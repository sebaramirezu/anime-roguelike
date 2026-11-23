import { describe, expect, it } from 'vitest'
import { canFuse, fuseItems, type FusionItemDefinition, type FusionRecipe } from './fusion'
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
})
