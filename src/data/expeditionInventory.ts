import {
  canPlaceItem, findFusionResult, findSharedEdge, getInventoryCapacity, getInventoryMask, getOccupiedCells, moveItem, resolveFusion,
  placeItem, removeItem, rotateItem, rotateShape, withCompletedLevels,
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
  | { kind: 'remove'; instanceId: string }

const byId = new Map(items.map((item) => [item.id, item]))

export function inventoryView({ bag, tray }: ExpeditionInventory) {
  const placed = bag.items.map((instance) => {
    const item = byId.get(instance.itemId)
    if (!item) throw new Error('Objeto colocado ausente del catálogo.')
    return {
      entry: { id: instance.instanceId, item, rotation: instance.rotation },
      anchor: instance.anchor,
      cells: getOccupiedCells(instance),
    }
  })
  return {
    tray, placed, capacity: getInventoryCapacity(bag.completedLevels), mask: getInventoryMask(bag.completedLevels),
  }
}

export type InventorySnapshot = ReturnType<typeof inventoryView>
type FusionNotice = { item: Item; placed: boolean }
type Success = { ok: true; inventory: ExpeditionInventory; fusion?: FusionNotice }
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
  const cells = translate(rotateShape(item.shape, rotation), anchor)
  const valid = canPlaceItem(bag, item, anchor, rotation, placed?.instanceId)
  const fusion = valid ? adjacentRecipe(bag, id, item.id, cells) : undefined
  return fusion ? { cells, valid, fusion: fusion.result } : { cells, valid }
}

function fusionRequest({ bag, tray }: ExpeditionInventory, firstId: string, secondId: string) {
  const used = new Set([...bag.items.map(({ instanceId }) => instanceId), ...tray.map(({ id }) => id)])
  let sequence = 1
  while (used.has(`fusion-${sequence}`)) sequence++
  return { firstInstanceId: firstId, secondInstanceId: secondId, resultInstanceId: `fusion-${sequence}` }
}

function adjacentRecipe(bag: InventoryState, instanceId: string, itemId: string, cells: readonly Cell[]) {
  if (bag.combatActive || byId.get(itemId)?.level !== 5) return undefined
  for (const other of bag.items) {
    if (other.instanceId === instanceId) continue
    const result = findFusionResult(items, fusionRecipes, itemId, other.itemId)
    if (result && findSharedEdge(cells, getOccupiedCells(other))) return { partnerId: other.instanceId, result }
  }
}

function commitPlacement(inventory: ExpeditionInventory, instanceId: string): Success {
  const instance = inventory.bag.items.find((entry) => entry.instanceId === instanceId)
  if (!instance) return { ok: true, inventory }
  const match = adjacentRecipe(inventory.bag, instanceId, instance.itemId, getOccupiedCells(instance))
  if (!match) return { ok: true, inventory }
  const request = fusionRequest(inventory, instanceId, match.partnerId)
  const resolved = resolveFusion(inventory.bag, items, fusionRecipes, request)
  if (!resolved) throw new Error('La fusión no pudo completarse.')
  const { item, placed } = resolved
  const tray = placed ? inventory.tray : [...inventory.tray, { id: request.resultInstanceId, item, rotation: 0 as const }]
  return { ok: true, inventory: { bag: resolved.inventory, tray }, fusion: { item, placed } }
}

export function editInventory(inventory: ExpeditionInventory, command: InventoryCommand): InventoryResponse {
  const { bag, tray } = inventory
  if (bag.combatActive) return { ok: false, error: 'La mochila está bloqueada durante el combate.' }
  try {
    switch (command.kind) {
      case 'remove': {
        const instance = bag.items.find(({ instanceId }) => instanceId === command.instanceId)
        const item = instance && byId.get(instance.itemId)
        if (!instance || !item) return { ok: false, error: 'El objeto ya no está equipado.' }
        return { ok: true, inventory: {
          bag: removeItem(bag, instance.instanceId),
          tray: [...tray, { id: instance.instanceId, item, rotation: instance.rotation }],
        } }
      }
      case 'place': {
        const entry = tray.find(({ id }) => id === command.instanceId)
        if (!entry) return { ok: false, error: 'El objeto ya no está en la bandeja.' }
        const updated = placeItem(bag, entry.item, entry.id, command.anchor, entry.rotation)
        return commitPlacement({ bag: updated, tray: tray.filter(({ id }) => id !== entry.id) }, entry.id)
      }
      case 'move':
        return commitPlacement({ ...inventory, bag: moveItem(bag, command.instanceId, command.anchor) }, command.instanceId)
      case 'rotate': {
        const entry = tray.find(({ id }) => id === command.instanceId)
        if (!entry) return commitPlacement({ ...inventory, bag: rotateItem(bag, command.instanceId) }, command.instanceId)
        const rotation = ((entry.rotation + 90) % 360) as Rotation
        return { ok: true, inventory: { bag, tray: tray.map((item) => item.id === entry.id ? { ...item, rotation } : item) } }
      }
    }
  } catch {
    const error = command.kind === 'rotate' ? 'La pieza no puede girar en su posición actual.'
      : 'La pieza completa debe estar dentro de la mochila, sobre casillas habilitadas y libres.'
    return { ok: false, error }
  }
}

export function expandInventory(inventory: ExpeditionInventory, completedLevels: number): ExpeditionInventory {
  if (inventory.bag.combatActive || completedLevels <= inventory.bag.completedLevels) return inventory
  // The engine masks are nested: each expansion contains every previously enabled cell.
  return { ...inventory, bag: withCompletedLevels(inventory.bag, completedLevels) }
}
