import { describe, expect, it, vi } from 'vitest'
import * as engine from '../engine'
import { createInventory, findSharedEdge, getOccupiedCells, placeItem, resolveFusion, setInventoryCombatLock } from '../engine'
import { advanceEquipment, buyOffer, offersFor, startEquipmentSession } from './equipmentSession'
import { editInventory, inventoryView, previewPlacement, type ExpeditionInventory, type InventoryCommand } from './expeditionInventory'
import { restoreExpedition, serializeExpedition } from './expeditionSave'
import { fusionRecipes } from './fusionRecipes'
import { items, type Cell } from './items'

const lookup = (id: string) => items.find((item) => item.id === id)!
const [naruto, variant, resultId] = ['rasenshuriken', 'kurama-rasenshuriken', 'baryon-mode']

function setup(...ids: string[]): ExpeditionInventory {
  return { bag: createInventory(), tray: ids.map((id, index) => ({ id: `piece-${index}`, item: lookup(id), rotation: 0 })) }
}

function edit(inventory: ExpeditionInventory, command: InventoryCommand) {
  const response = editInventory(inventory, command)
  if (!response.ok) throw new Error(response.error)
  return response
}

function place(inventory: ExpeditionInventory, instanceId: string, anchor: Cell) {
  return edit(inventory, { kind: 'place', instanceId, anchor })
}

describe('orthogonal adjacency', () => {
  it('detects horizontal contact', () => expect(findSharedEdge([[1, 1]], [[2, 1]])).toEqual([[1, 1], [2, 1]]))
  it('detects vertical contact', () => expect(findSharedEdge([[1, 1]], [[1, 2]])).toEqual([[1, 1], [1, 2]]))
  it('ignores diagonals and overlapping pieces', () => {
    expect(findSharedEdge([[1, 1]], [[2, 2]])).toBeUndefined()
    expect(findSharedEdge([[1, 1], [2, 1]], [[1, 1], [1, 2]])).toBeUndefined()
  })
  it('uses the outer cells of rotated irregular pieces', () => {
    const inventory = place(setup(naruto), 'piece-0', [0, 2]).inventory
    const first = inventory.bag.items[0]
    const second = { instanceId: 'variant', itemId: variant, shape: lookup(variant).shape, anchor: [2, 0] as const, rotation: 90 as const }
    expect(findSharedEdge(getOccupiedCells(first), getOccupiedCells(second))).toEqual([[1, 2], [2, 2]])
  })
})

describe('automatic fusion', () => {
  it.each(fusionRecipes)('automatically places $result, consuming exactly its two ingredients', (recipe) => {
    const before = place(setup(...recipe.ingredients, 'basic-shield'), 'piece-0', [1, 1]).inventory
    expect(previewPlacement(before, 'piece-1', [3, 1])?.fusion?.id).toBe(recipe.result)
    expect(before.bag.items.map(({ instanceId }) => instanceId)).toEqual(['piece-0'])
    expect(before.tray.map(({ id }) => id)).toEqual(['piece-1', 'piece-2'])
    const after = place(before, 'piece-1', [3, 1])
    expect(after.fusion).toMatchObject({ item: { id: recipe.result, level: 6 }, placed: true })
    expect(after.inventory.bag.items.map(({ instanceId, itemId }) => [instanceId, itemId])).toEqual([['fusion-1', recipe.result]])
    expect(after.inventory.tray.map(({ id }) => id)).toEqual(['piece-2'])
  })

  it('fuses after moving a placed ingredient into contact', () => {
    const first = place(setup(naruto, variant), 'piece-0', [0, 0]).inventory
    const second = place(first, 'piece-1', [3, 2])
    expect(second.fusion).toBeUndefined()
    const moved = edit(second.inventory, { kind: 'move', instanceId: 'piece-1', anchor: [3, 1] })
    expect(moved.fusion?.item.id).toBe(resultId)
  })

  it('fuses after rotating a placed ingredient into contact', () => {
    const first = place(setup(naruto, variant), 'piece-0', [0, 2]).inventory
    const second = place(first, 'piece-1', [2, 0])
    expect(second.fusion).toBeUndefined()
    const rotated = edit(second.inventory, { kind: 'rotate', instanceId: 'piece-1' })
    expect(rotated.fusion?.item.id).toBe(resultId)
  })

  it('keeps both ingredients after a diagonal placement or an invalid overlap', () => {
    const first = place(setup(naruto, variant), 'piece-0', [0, 0]).inventory
    const diagonal = place(first, 'piece-1', [3, 2])
    expect(diagonal.fusion).toBeUndefined()
    expect(editInventory(diagonal.inventory, { kind: 'move', instanceId: 'piece-1', anchor: [0, 1] }).ok).toBe(false)
    expect(diagonal.inventory.bag.items).toHaveLength(2)
  })

  it('does not fuse different recipes, duplicate item types or pieces in the tray', () => {
    for (const other of [naruto, 'focused-spirit-bomb']) {
      const first = place(setup(naruto, other, variant), 'piece-0', [1, 1])
      expect(first.fusion).toBeUndefined()
      const next = place(first.inventory, 'piece-1', other === naruto ? [3, 2] : [3, 1])
      expect(next.fusion).toBeUndefined()
      expect(next.inventory.tray.map(({ item }) => item.id)).toEqual([variant])
    }
  })

  it('returns one unplaced result when no valid position exists', () => {
    const definitions = [
      { id: 'a', level: 5, shape: [[0, 0]] as const },
      { id: 'b', level: 5, shape: [[0, 0]] as const },
      { id: 'ultimate', level: 6, shape: [[0, 0], [1, 0], [2, 0]] as const },
    ]
    const full = inventoryView(setup()).mask.reduce((bag, row, y) =>
      row.reduce((current, open, x) => open ? placeItem(current, definitions[x === 2 ? 1 : 0], `${x}-${y}`, [x, y]) : current, bag), createInventory())
    const resolved = resolveFusion(full, definitions, [{ ingredients: ['a', 'b'], result: 'ultimate' }],
      { firstInstanceId: '1-0', secondInstanceId: '2-0', resultInstanceId: 'new' })
    expect(resolved).toMatchObject({ item: { id: 'ultimate' }, placed: false })
    expect(resolved?.inventory.items).toHaveLength(30)
    expect(full.items).toHaveLength(32)
  })

  it('routes a result that does not fit into the tray once', () => {
    const first = place(setup(naruto, variant), 'piece-0', [1, 1]).inventory
    const secondCells = previewPlacement(first, 'piece-1', [3, 1])!.cells
    const reserved = [...getOccupiedCells(first.bag.items[0]), ...secondCells]
    const full = engine.getInventoryCells(0).reduce((bag, cell, index) => reserved.some(([x, y]) => x === cell[0] && y === cell[1])
      ? bag : placeItem(bag, lookup('basic-shield'), `blocker-${index}`, cell), first.bag)
    const largerShape = Array.from({ length: 9 }, (_, index): Cell => [index % 3, Math.floor(index / 3)])
    const spy = vi.spyOn(engine, 'resolveFusion').mockImplementationOnce((bag, catalog, recipes, request) =>
      resolveFusion(bag, catalog.map((item) => item.id === resultId ? { ...item, shape: largerShape } : item), recipes, request))

    try {
      const fused = place({ ...first, bag: full }, 'piece-1', [3, 1])
      expect(fused.fusion).toMatchObject({ item: { id: resultId }, placed: false })
      expect(fused.inventory.bag.items).toHaveLength(full.items.length - 1)
      expect(fused.inventory.tray).toMatchObject([{ id: 'fusion-1', item: { id: resultId }, rotation: 0 }])
    } finally {
      spy.mockRestore()
    }
  })

  it('preserves an old adjacent pair on load and restores a fused result exactly once across level progression', () => {
    const started = startEquipmentSession('naruto', [lookup('kunai'), lookup('basic-shield')])!
    const touching = placeItem(placeItem(createInventory(), lookup(naruto), 'old-1', [1, 1]), lookup(variant), 'old-2', [3, 1])
    const old = { stageIndex: 11, session: { ...started, inventory: { ...started.inventory, bag: touching } } }
    const restored = restoreExpedition(serializeExpedition(old))!
    expect(restored.session.inventory.bag.items).toHaveLength(2)
    const fused = edit(restored.session.inventory, { kind: 'move', instanceId: 'old-2', anchor: [3, 1] })
    const levelTwo = advanceEquipment({ ...restored.session, inventory: fused.inventory }, 7, true)
    const raw = serializeExpedition({ session: levelTwo, stageIndex: 12 })
    expect(restoreExpedition(raw)?.session.inventory).toEqual(levelTwo.inventory)
    expect(restoreExpedition(raw)?.session.inventory.bag.items.map(({ itemId }) => itemId)).toEqual([resultId])
  })

  it('never activates a pending fusion while combat locks the bag', () => {
    const first = place(setup(naruto, variant), 'piece-0', [1, 1]).inventory
    const locked = { ...first, bag: setInventoryCombatLock(first.bag, true) }
    expect(previewPlacement(locked, 'piece-1', [3, 1])?.fusion).toBeUndefined()
    expect(editInventory(locked, { kind: 'place', instanceId: 'piece-1', anchor: [3, 1] }).ok).toBe(false)
    expect(locked.bag.items).toHaveLength(1)
    expect(locked.tray).toHaveLength(1)
  })

  it('makes both recipes obtainable without selling their results', () => {
    for (const character of ['goku', 'naruto'] as const) {
      const offers = Array.from({ length: items.length }, (_, round) => offersFor(character, round)).flat()
      const recipe = fusionRecipes.find(({ result }) => lookup(result).owner === character)!
      for (const ingredient of recipe.ingredients) {
        const offer = offers.find(({ item }) => item.id === ingredient)!
        const starter = startEquipmentSession(character, [lookup(character === 'goku' ? 'power-pole' : 'kunai'), lookup('basic-shield')])!
        expect(buyOffer({ ...starter, offers: [offer] }, offer.id).inventory.tray.at(-1)?.item.id).toBe(ingredient)
      }
      expect(offers.every(({ item }) => item.level < 6)).toBe(true)
    }
  })
})
