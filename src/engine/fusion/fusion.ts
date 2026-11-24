import { getInventoryCells } from '../inventory/capacity'
import { canPlaceItem, findSharedEdge, getOccupiedCells, placeItem, removeItem } from '../inventory/inventory'
import type { InventoryState, Rotation, SpatialItemDefinition } from '../inventory/types'

export interface FusionItemDefinition extends SpatialItemDefinition {
  level: number
  owner?: string
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

export function findFusionResult<T extends FusionItemDefinition>(
  items: readonly T[], recipes: readonly FusionRecipe[], firstId: string, secondId: string,
): T | undefined {
  const recipe = recipes.find(({ ingredients: [first, second] }) =>
    (first === firstId && second === secondId) || (first === secondId && second === firstId))
  if (!recipe || recipe.result === firstId || recipe.result === secondId) return undefined

  const first = items.find(({ id }) => id === firstId)
  const second = items.find(({ id }) => id === secondId)
  const result = items.find(({ id }) => id === recipe.result)
  if (!first || !second || !result || first.level >= 6 || second.level >= 6) return undefined
  const owners = new Set([first.owner, second.owner, result.owner].filter((owner) => owner && owner !== 'shared'))
  if (owners.size > 1 || result.level < 1 || result.level > 6) return undefined
  if (result.level === 6 && (firstId === secondId || first.level !== 5 || second.level !== 5)) return undefined
  return result
}

export function resolveFusion<T extends FusionItemDefinition>(
  inventory: InventoryState,
  items: readonly T[],
  recipes: readonly FusionRecipe[],
  request: FusionRequest,
) {
  const { firstInstanceId, secondInstanceId, resultInstanceId } = request
  if (inventory.combatActive || firstInstanceId === secondInstanceId || !resultInstanceId
    || inventory.items.some(({ instanceId }) => instanceId === resultInstanceId)) return undefined
  const first = inventory.items.find(({ instanceId }) => instanceId === firstInstanceId)
  const second = inventory.items.find(({ instanceId }) => instanceId === secondInstanceId)
  if (!first || !second || !findSharedEdge(getOccupiedCells(first), getOccupiedCells(second))) return undefined
  const item = findFusionResult(items, recipes, first.itemId, second.itemId)
  if (!item) return undefined

  const reduced = removeItem(removeItem(inventory, firstInstanceId), secondInstanceId)
  const anchors = [first.anchor, second.anchor, ...getInventoryCells(reduced.completedLevels)]
  const rotations: readonly Rotation[] = [0, 90, 180, 270]
  for (const rotation of rotations) {
    const anchor = anchors.find((cell) => canPlaceItem(reduced, item, cell, rotation))
    if (anchor) return { inventory: placeItem(reduced, item, resultInstanceId, anchor, rotation), item, placed: true }
  }
  return { inventory: reduced, item, placed: false }
}

/** Compatibility API for callers whose result must remain on the board. */
export function canFuse(
  inventory: InventoryState, items: readonly FusionItemDefinition[], recipes: readonly FusionRecipe[], request: FusionRequest,
): boolean {
  return resolveFusion(inventory, items, recipes, request)?.placed === true
}

export function fuseItems(
  inventory: InventoryState, items: readonly FusionItemDefinition[], recipes: readonly FusionRecipe[], request: FusionRequest,
): InventoryState {
  const resolved = resolveFusion(inventory, items, recipes, request)
  if (!resolved?.placed) throw new Error('These item instances do not match an available fusion recipe or the result does not fit.')
  return resolved.inventory
}
