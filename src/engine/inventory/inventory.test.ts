import { describe, expect, it } from 'vitest'
import { getInventoryCapacity, getInventoryMask } from './capacity'
import {
  canPlaceItem,
  createInventory,
  getItemAdjacencies,
  moveItem,
  placeItem,
  removeItem,
  rotateItem,
  setInventoryCombatLock,
  withCompletedLevels,
} from './inventory'

const domino = { id: 'kunai', shape: [[0, 0], [1, 0]] as const }
const single = { id: 'shield', shape: [[0, 0]] as const }

describe('spatial inventory', () => {
  it('uses 32, 42, and 49 playable cells as level milestones are completed', () => {
    expect(getInventoryCapacity(0)).toBe(32)
    expect(getInventoryCapacity(1)).toBe(42)
    expect(getInventoryCapacity(2)).toBe(49)
    expect(getInventoryCapacity(5)).toBe(49)
    expect(getInventoryMask(0).flat().filter(Boolean)).toHaveLength(32)
    expect(getInventoryMask(1).flat().filter(Boolean)).toHaveLength(42)
    expect(getInventoryMask(2).flat().filter(Boolean)).toHaveLength(49)
  })

  it('rejects blocked, out-of-bounds, and overlapping placements', () => {
    const inventory = placeItem(createInventory(), domino, 'kunai-a', [1, 1])
    expect(canPlaceItem(inventory, single, [0, 0])).toBe(false)
    expect(canPlaceItem(inventory, domino, [5, 2])).toBe(false)
    expect(canPlaceItem(inventory, single, [2, 1])).toBe(false)
    expect(canPlaceItem(inventory, single, [3, 1])).toBe(true)
  })

  it('rotates, moves, removes, and reports edge-adjacent instances', () => {
    let inventory = placeItem(createInventory(), domino, 'kunai-a', [1, 1])
    inventory = placeItem(inventory, single, 'shield-a', [1, 2])
    expect(getItemAdjacencies(inventory)).toHaveLength(1)
    inventory = moveItem(inventory, 'shield-a', [5, 4])
    inventory = rotateItem(inventory, 'kunai-a')
    expect(inventory.items[0]?.rotation).toBe(90)
    expect(canPlaceItem(inventory, domino, [1, 1], 90, 'kunai-a')).toBe(true)
    inventory = moveItem(inventory, 'kunai-a', [3, 1])
    expect(inventory.items[0]?.anchor).toEqual([3, 1])
    inventory = removeItem(inventory, 'shield-a')
    expect(inventory.items.map(({ instanceId }) => instanceId)).toEqual(['kunai-a'])
  })

  it('preserves valid placements during expansion and blocks edits during combat', () => {
    const inventory = placeItem(createInventory(), domino, 'kunai-a', [4, 4])
    const expanded = withCompletedLevels(inventory, 1)
    expect(expanded.items).toEqual(inventory.items)
    expect(canPlaceItem(setInventoryCombatLock(expanded, true), single, [6, 0])).toBe(false)
    expect(() => removeItem(setInventoryCombatLock(expanded, true), 'kunai-a')).toThrow(/combat/i)
  })

  it('allows separate instances of the same catalog item', () => {
    const first = placeItem(createInventory(), single, 'shield-one', [1, 1])
    const second = placeItem(first, single, 'shield-two', [2, 1])
    expect(second.items.map(({ itemId }) => itemId)).toEqual(['shield', 'shield'])
    expect(() => placeItem(second, single, 'shield-one', [3, 1])).toThrow(/unique/i)
  })
})
