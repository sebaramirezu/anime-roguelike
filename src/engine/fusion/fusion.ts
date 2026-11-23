import { canPlaceItem, placeItem, removeItem } from '../inventory/inventory'
import type { InventoryState, SpatialItemDefinition } from '../inventory/types'

export interface FusionItemDefinition extends SpatialItemDefinition {
  level: number
}

export interface FusionRecipe {
  ingredients: readonly [string, string]
  result: string
}

export interface FusionRequest {
  firstInstanceId: string
  secondInstanceId: string
  resultInstanceId: string
}

function recipeMatches(recipe: FusionRecipe, firstId: string, secondId: string): boolean {
  return recipe.ingredients.includes(firstId) && recipe.ingredients.includes(secondId)
}

export function canFuse(
  inventory: InventoryState,
  items: readonly FusionItemDefinition[],
  recipes: readonly FusionRecipe[],
  request: FusionRequest,
): boolean {
  if (inventory.combatActive || request.firstInstanceId === request.secondInstanceId
    || !request.resultInstanceId || inventory.items.some(({ instanceId }) => instanceId === request.resultInstanceId)) return false
  const first = inventory.items.find(({ instanceId }) => instanceId === request.firstInstanceId)
  const second = inventory.items.find(({ instanceId }) => instanceId === request.secondInstanceId)
  if (!first || !second || first.itemId === second.itemId) return false
  const firstDefinition = items.find(({ id }) => id === first.itemId)
  const secondDefinition = items.find(({ id }) => id === second.itemId)
  if (firstDefinition?.level !== 5 || secondDefinition?.level !== 5) return false
  const recipe = recipes.find(({ ingredients }) => recipeMatches({ ingredients, result: '' }, first.itemId, second.itemId))
  if (!recipe) return false
  const result = items.find(({ id }) => id === recipe.result)
  if (!result || result.level !== 6) return false

  const reducedInventory: InventoryState = {
    ...inventory,
    items: inventory.items.filter(({ instanceId }) => instanceId !== first.instanceId && instanceId !== second.instanceId),
  }
  return canPlaceItem(reducedInventory, result, first.anchor, 0)
}

export function fuseItems(
  inventory: InventoryState,
  items: readonly FusionItemDefinition[],
  recipes: readonly FusionRecipe[],
  request: FusionRequest,
): InventoryState {
  if (!canFuse(inventory, items, recipes, request)) throw new Error('These item instances do not match an available fusion recipe.')
  const first = inventory.items.find(({ instanceId }) => instanceId === request.firstInstanceId)
  if (!first) throw new Error(`Unknown item instance: ${request.firstInstanceId}`)
  const firstId = first.itemId
  const secondId = inventory.items.find(({ instanceId }) => instanceId === request.secondInstanceId)?.itemId
  const recipe = recipes.find(({ ingredients }) => !!secondId && recipeMatches({ ingredients, result: '' }, firstId, secondId))
  const result = items.find(({ id }) => id === recipe?.result)
  if (!result) throw new Error('Fusion recipe result is missing from the item catalog.')

  const consumed = removeItem(removeItem(inventory, request.firstInstanceId), request.secondInstanceId)
  return placeItem(consumed, result, request.resultInstanceId, first.anchor)
}
