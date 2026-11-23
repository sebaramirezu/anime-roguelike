import {
  canFuse, canPlaceItem, fuseItems, getInventoryCapacity, getInventoryMask, moveItem,
  placeItem, rotateItem, rotateShape, withCompletedLevels,
  type InventoryState, type Rotation,
} from '../engine'
import { fusionRecipes } from './fusionRecipes'
import { items, type Cell, type Item } from './items'

export type TrayEntry = { id: string; item: Item }
export type UnplacedEntry = TrayEntry & { rotation: Rotation }
export type ExpeditionInventory = { bag: InventoryState; tray: readonly UnplacedEntry[] }
export type InventoryCommand =
  | { kind: 'place' | 'move'; instanceId: string; anchor: Cell }
  | { kind: 'rotate'; instanceId: string }
  | { kind: 'fuse'; firstId: string; secondId: string }

const byId = new Map(items.map((item) => [item.id, item]))

export function inventoryView({ bag, tray }: ExpeditionInventory) {
  const placed = bag.items.map((instance) => {
    const item = byId.get(instance.itemId)
    if (!item) throw new Error('Objeto colocado ausente del catálogo.')
    return {
      entry: { id: instance.instanceId, item, rotation: instance.rotation },
      anchor: instance.anchor,
      cells: translate(rotateShape(instance.shape, instance.rotation), instance.anchor),
    }
  })
  return {
    tray, placed, capacity: getInventoryCapacity(bag.completedLevels), mask: getInventoryMask(bag.completedLevels),
  }
}

export type InventorySnapshot = ReturnType<typeof inventoryView>
type Success = { ok: true; inventory: ExpeditionInventory }
type Failure = { ok: false; error: string }
export type InventoryResponse = Success | Failure

function translate(shape: readonly Cell[], [x, y]: Cell): readonly Cell[] {
  return shape.map(([column, row]) => [column + x, row + y])
}

export function previewPlacement({ bag, tray }: ExpeditionInventory, id: string, anchor: Cell) {
  const placed = bag.items.find((entry) => entry.instanceId === id)
  const unplaced = tray.find((entry) => entry.id === id)
  const item = placed ? { id: placed.itemId, shape: placed.shape } : unplaced?.item
  if (!item) return undefined
  const rotation = placed?.rotation ?? unplaced?.rotation ?? 0
  return {
    cells: translate(rotateShape(item.shape, rotation), anchor),
    valid: canPlaceItem(bag, item, anchor, rotation, placed?.instanceId),
  }
}

function fusionRequest({ bag, tray }: ExpeditionInventory, firstId: string, secondId: string) {
  const used = new Set([...bag.items.map(({ instanceId }) => instanceId), ...tray.map(({ id }) => id)])
  let sequence = 1
  while (used.has(`fusion-${sequence}`)) sequence++
  return { firstInstanceId: firstId, secondInstanceId: secondId, resultInstanceId: `fusion-${sequence}` }
}

export function fusionOptions(inventory: ExpeditionInventory, firstId: string) {
  const first = inventory.bag.items.find(({ instanceId }) => instanceId === firstId)
  if (!first || byId.get(first.itemId)?.level !== 5) return []
  return inventory.bag.items.flatMap((second) => {
    const recipe = fusionRecipes.find(({ ingredients }) => ingredients.includes(first.itemId) && ingredients.includes(second.itemId))
    const result = recipe && byId.get(recipe.result)
    if (!result || !canFuse(inventory.bag, items, fusionRecipes, fusionRequest(inventory, firstId, second.instanceId))) return []
    return [{ secondId: second.instanceId, name: byId.get(second.itemId)?.name, result }]
  })
}

export function editInventory(inventory: ExpeditionInventory, command: InventoryCommand): InventoryResponse {
  const { bag, tray } = inventory
  if (bag.combatActive) return { ok: false, error: 'La mochila está bloqueada durante el combate.' }
  try {
    switch (command.kind) {
      case 'place': {
        const entry = tray.find(({ id }) => id === command.instanceId)
        if (!entry) return { ok: false, error: 'El objeto ya no está en la bandeja.' }
        const updated = placeItem(bag, entry.item, entry.id, command.anchor, entry.rotation)
        return { ok: true, inventory: { bag: updated, tray: tray.filter(({ id }) => id !== entry.id) } }
      }
      case 'move':
        return { ok: true, inventory: { ...inventory, bag: moveItem(bag, command.instanceId, command.anchor) } }
      case 'rotate': {
        const entry = tray.find(({ id }) => id === command.instanceId)
        if (!entry) return { ok: true, inventory: { ...inventory, bag: rotateItem(bag, command.instanceId) } }
        const rotation = ((entry.rotation + 90) % 360) as Rotation
        return { ok: true, inventory: { bag, tray: tray.map((item) => item.id === entry.id ? { ...item, rotation } : item) } }
      }
      case 'fuse':
        return { ok: true, inventory: { ...inventory, bag: fuseItems(bag, items, fusionRecipes, fusionRequest(inventory, command.firstId, command.secondId)) } }
    }
  } catch {
    const error = command.kind === 'fuse' ? 'La combinación ya no está disponible o su resultado no cabe.'
      : command.kind === 'rotate' ? 'La pieza no puede girar en su posición actual.'
      : 'La pieza completa debe estar dentro de la mochila, sobre casillas habilitadas y libres.'
    return { ok: false, error }
  }
}

export function expandInventory(inventory: ExpeditionInventory, completedLevels: number): ExpeditionInventory {
  if (inventory.bag.combatActive || completedLevels <= inventory.bag.completedLevels) return inventory
  // The engine masks are nested: each expansion contains every previously enabled cell.
  return { ...inventory, bag: withCompletedLevels(inventory.bag, completedLevels) }
}
