import { getInventoryMask } from './capacity'
import type {
  Cell,
  InventoryState,
  ItemAdjacency,
  ItemInstance,
  Rotation,
  SpatialItemDefinition,
} from './types'

const rotations: readonly Rotation[] = [0, 90, 180, 270]

function validateShape(shape: readonly Cell[]): void {
  if (shape.length === 0) throw new Error('An item shape must contain at least one cell.')
  const seen = new Set<string>()
  for (const [x, y] of shape) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
      throw new Error('Item shape coordinates must be non-negative integers.')
    }
    const key = `${x},${y}`
    if (seen.has(key)) throw new Error('An item shape cannot contain duplicate cells.')
    seen.add(key)
  }
}

export function createInventory(completedLevels = 0): InventoryState {
  getInventoryMask(completedLevels)
  return { completedLevels, items: [], combatActive: false }
}

export function setInventoryCombatLock(state: InventoryState, combatActive: boolean): InventoryState {
  return state.combatActive === combatActive ? state : { ...state, combatActive }
}

export function withCompletedLevels(state: InventoryState, completedLevels: number): InventoryState {
  // Validate progression and preserve instances; expansion never relocates objects.
  getInventoryMask(completedLevels)
  return { ...state, completedLevels }
}

export function rotateShape(shape: readonly Cell[], rotation: Rotation): readonly Cell[] {
  validateShape(shape)
  if (!rotations.includes(rotation)) throw new Error('rotation must be 0, 90, 180, or 270 degrees.')
  const transformed = shape.map(([x, y]): Cell => {
    if (rotation === 90) return [-y, x]
    if (rotation === 180) return [-x, -y]
    if (rotation === 270) return [y, -x]
    return [x, y]
  })
  const minX = Math.min(...transformed.map(([x]) => x))
  const minY = Math.min(...transformed.map(([, y]) => y))
  return transformed.map(([x, y]) => [x - minX, y - minY])
}

function occupiedCells(item: SpatialItemDefinition, anchor: Cell, rotation: Rotation): readonly Cell[] {
  return rotateShape(item.shape, rotation).map(([x, y]) => [anchor[0] + x, anchor[1] + y])
}

function isCellOpen(state: InventoryState, [x, y]: Cell): boolean {
  const row = getInventoryMask(state.completedLevels)[y]
  return row?.[x] === true
}

function placementValid(
  state: InventoryState,
  item: SpatialItemDefinition,
  anchor: Cell,
  rotation: Rotation,
): boolean {
  if (!item.id || !Number.isInteger(anchor[0]) || !Number.isInteger(anchor[1])) return false
  let cells: readonly Cell[]
  try {
    cells = occupiedCells(item, anchor, rotation)
  } catch {
    return false
  }
  return cells.every((cell) => isCellOpen(state, cell))
}

function collides(state: InventoryState, cells: readonly Cell[], ignoredInstanceId?: string): boolean {
  const target = new Set(cells.map(([x, y]) => `${x},${y}`))
  return state.items.some((instance) => {
    if (instance.instanceId === ignoredInstanceId) return false
    return occupiedCells({ id: instance.itemId, shape: instance.shape }, instance.anchor, instance.rotation)
      .some(([x, y]) => target.has(`${x},${y}`))
  })
}

export function canPlaceItem(
  state: InventoryState,
  item: SpatialItemDefinition,
  anchor: Cell,
  rotation: Rotation = 0,
  ignoredInstanceId?: string,
): boolean {
  if (state.combatActive || !placementValid(state, item, anchor, rotation)) return false
  return !collides(state, occupiedCells(item, anchor, rotation), ignoredInstanceId)
}

export function placeItem(
  state: InventoryState,
  item: SpatialItemDefinition,
  instanceId: string,
  anchor: Cell,
  rotation: Rotation = 0,
): InventoryState {
  if (!instanceId || state.items.some((entry) => entry.instanceId === instanceId)) {
    throw new Error('instanceId must be unique within the inventory.')
  }
  if (!canPlaceItem(state, item, anchor, rotation)) throw new Error('The item cannot be placed at that position.')
  const instance: ItemInstance = { instanceId, itemId: item.id, shape: item.shape, anchor, rotation }
  return { ...state, items: [...state.items, instance] }
}

function definitionFor(state: InventoryState, instanceId: string): SpatialItemDefinition | undefined {
  const instance = state.items.find((entry) => entry.instanceId === instanceId)
  return instance ? { id: instance.itemId, shape: instance.shape } : undefined
}

export function removeItem(state: InventoryState, instanceId: string): InventoryState {
  if (state.combatActive) throw new Error('Inventory cannot be modified during combat.')
  return { ...state, items: state.items.filter((instance) => instance.instanceId !== instanceId) }
}

export function moveItem(state: InventoryState, instanceId: string, anchor: Cell): InventoryState {
  if (state.combatActive) throw new Error('Inventory cannot be modified during combat.')
  const instance = state.items.find((entry) => entry.instanceId === instanceId)
  const item = definitionFor(state, instanceId)
  if (!instance || !item) throw new Error(`Unknown item instance: ${instanceId}`)
  if (!canPlaceItem(state, item, anchor, instance.rotation, instanceId)) throw new Error('The item cannot be moved to that position.')
  return { ...state, items: state.items.map((entry) => entry.instanceId === instanceId ? { ...entry, anchor } : entry) }
}

export function rotateItem(state: InventoryState, instanceId: string, clockwise = true): InventoryState {
  if (state.combatActive) throw new Error('Inventory cannot be modified during combat.')
  const instance = state.items.find((entry) => entry.instanceId === instanceId)
  const item = definitionFor(state, instanceId)
  if (!instance || !item) throw new Error(`Unknown item instance: ${instanceId}`)
  const rotation = ((instance.rotation + (clockwise ? 90 : 270)) % 360) as Rotation
  if (!canPlaceItem(state, item, instance.anchor, rotation, instanceId)) throw new Error('The item cannot be rotated at that position.')
  return { ...state, items: state.items.map((entry) => entry.instanceId === instanceId ? { ...entry, rotation } : entry) }
}

export function getItemAdjacencies(state: InventoryState): readonly ItemAdjacency[] {
  const result: ItemAdjacency[] = []
  for (let i = 0; i < state.items.length; i += 1) {
    const first = state.items[i]
    if (!first) continue
    const firstShape = definitionFor(state, first.instanceId)
    if (!firstShape) continue
    const firstCells = occupiedCells(firstShape, first.anchor, first.rotation)
    for (let j = i + 1; j < state.items.length; j += 1) {
      const second = state.items[j]
      if (!second) continue
      const secondShape = definitionFor(state, second.instanceId)
      if (!secondShape) continue
      const secondCells = occupiedCells(secondShape, second.anchor, second.rotation)
      for (const [x, y] of firstCells) {
        const neighbor = secondCells.find(([otherX, otherY]) => Math.abs(x - otherX) + Math.abs(y - otherY) === 1)
        if (neighbor) {
          result.push({ firstInstanceId: first.instanceId, secondInstanceId: second.instanceId, touchingCells: [[x, y], neighbor] })
          break
        }
      }
    }
  }
  return result
}
