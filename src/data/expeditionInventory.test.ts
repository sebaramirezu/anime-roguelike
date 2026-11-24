import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveCombat } from '../adapters/liveCombat'
import type { CombatUpdate } from '../adapters/gameEngineAdapter'
import { createInventory, setInventoryCombatLock } from '../engine'
import { advanceEquipment, buyOffer, startEquipmentSession, type EquipmentSession } from './equipmentSession'
import { editInventory, inventoryView, previewPlacement, type ExpeditionInventory, type InventoryCommand } from './expeditionInventory'
import { expeditionSaveKey, loadExpedition, restoreExpedition, saveExpedition, serializeExpedition } from './expeditionSave'
import { items, type Cell } from './items'
import { stagesFor } from './levels'

function getItem(id: string) {
  const item = items.find((entry) => entry.id === id)
  if (!item) throw new Error(`Unknown fixture: ${id}`)
  return item
}

function setup(...ids: string[]): ExpeditionInventory {
  return { bag: createInventory(), tray: ids.map((id) => ({ id: `${id}-instance`, item: getItem(id), rotation: 0 })) }
}

function apply(inventory: ExpeditionInventory, command: InventoryCommand) {
  const result = editInventory(inventory, command)
  if (!result.ok) throw new Error(result.error)
  return result.inventory
}

function place(inventory: ExpeditionInventory, instanceId: string, anchor: Cell) {
  return apply(inventory, { kind: 'place', instanceId, anchor })
}

function session(): EquipmentSession {
  const started = startEquipmentSession('naruto', [getItem('kunai'), getItem('basic-shield')])
  if (!started) throw new Error('Expected a valid starter selection.')
  return started
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('expedition backpack regression', () => {
  it('renders the engine mask with exactly 32 enabled cells', () => {
    const { mask } = inventoryView(setup())
    expect(mask.map((row) => row.map((open) => open ? '#' : '.').join(''))).toEqual([
      '.####.', '######', '######', '######', '######', '.####.',
    ])
    expect(mask.flat().filter(Boolean)).toHaveLength(32)
  })

  it('rejects all four corners, edges outside the board, and a blocked non-anchor cell', () => {
    const inventory = setup('kunai', 'basic-shield')
    for (const anchor of [[0, 0], [5, 0], [0, 5], [5, 5], [-1, 1], [6, 1], [1, 6], [1, -1]] as const) {
      expect(editInventory(inventory, { kind: 'place', instanceId: 'basic-shield-instance', anchor }).ok).toBe(false)
    }
    expect(editInventory(inventory, { kind: 'place', instanceId: 'kunai-instance', anchor: [4, 0] }).ok).toBe(false)
    expect(editInventory(inventory, { kind: 'place', instanceId: 'kunai-instance', anchor: [5, 2] }).ok).toBe(false)
    expect(inventory.tray).toHaveLength(2)
    expect(inventory.bag.items).toHaveLength(0)
  })

  it('renders every cell of a valid multicell placement exactly where previewed', () => {
    const inventory = setup('kunai')
    const id = 'kunai-instance'
    const preview = previewPlacement(inventory, id, [2, 1])
    expect(preview).toEqual({ valid: true, cells: [[2, 1], [3, 1]] })
    const placed = place(inventory, id, [2, 1])
    expect(inventoryView(placed).placed[0].cells).toEqual(preview?.cells)
    expect(placed.tray).toHaveLength(0)
  })

  it('rejects overlaps even when the anchor is free', () => {
    const inventory = place(setup('kunai', 'basic-shield'), 'basic-shield-instance', [2, 1])
    expect(previewPlacement(inventory, 'kunai-instance', [1, 1])?.valid).toBe(false)
    expect(editInventory(inventory, { kind: 'place', instanceId: 'kunai-instance', anchor: [1, 1] }).ok).toBe(false)
    expect(inventory.bag.items[0].anchor).toEqual([2, 1])
  })

  it('keeps the rotation after a rejected turn and normalizes successful turns', () => {
    const id = 'kunai-instance'
    const blocked = place(setup('kunai'), id, [2, 5])
    expect(editInventory(blocked, { kind: 'rotate', instanceId: id }).ok).toBe(false)
    expect(blocked.bag.items[0].rotation).toBe(0)
    const rotated = apply(setup('kunai'), { kind: 'rotate', instanceId: id })
    const placed = place(rotated, id, [2, 1])
    expect(inventoryView(placed).placed[0].cells).toEqual([[2, 1], [2, 2]])
    expect(apply(placed, { kind: 'rotate', instanceId: id }).bag.items[0].rotation).toBe(180)
  })

  it('moves an instance across its old cells without duplicating it', () => {
    const id = 'kunai-instance'
    const inventory = place(setup('kunai'), id, [1, 1])
    const moved = apply(inventory, { kind: 'move', instanceId: id, anchor: [2, 1] })
    expect(moved.bag.items.map(({ instanceId, anchor }) => [instanceId, anchor])).toEqual([[id, [2, 1]]])
    expect(moved.tray).toHaveLength(0)
  })

  it('preserves placed instances across shop transactions and the next stage', () => {
    const started = session()
    const inventory = place(started.inventory, 'starter-kunai', [2, 1])
    const beforeShop = { ...started, inventory }
    const afterShop = buyOffer(beforeShop, beforeShop.offers[0].id)
    const afterCombat = advanceEquipment(afterShop, 7, false)
    expect(inventoryView(afterCombat.inventory).placed).toEqual(inventoryView(beforeShop.inventory).placed)
    expect(afterCombat.inventory.tray).toHaveLength(2)
  })

  it('stores and restores the same instances, orientations and pending purchases', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: {
      setItem: (key: string, value: string) => storage.set(key, value),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
    } })
    const started = session()
    const purchased = buyOffer(started, started.offers[0].id)
    const placed = place(purchased.inventory, 'starter-kunai', [2, 1])
    const inventory = apply(placed, { kind: 'rotate', instanceId: 'starter-kunai' })
    const saved = { ...purchased, inventory }
    expect(saveExpedition(saved, 0)).toBe(true)
    expect(loadExpedition()).toEqual({ session: saved, stageIndex: 0 })
    expect(storage.has(expeditionSaveKey)).toBe(true)
  })

  it('refuses old saves and corrupt instance IDs, rotations, positions and collisions', () => {
    const started = session()
    const first = place(started.inventory, 'starter-kunai', [1, 1])
    const inventory = place(first, 'starter-basic-shield', [3, 1])
    const raw = JSON.parse(serializeExpedition({ session: { ...started, inventory }, stageIndex: 0 }))
    expect(restoreExpedition(JSON.stringify({ ...raw, version: 0 }))).toBeNull()
    expect(restoreExpedition(JSON.stringify({ ...raw, tray: [raw.placed[0]] }))).toBeNull()
    for (const bad of [{ anchor: [5, 5] }, { anchor: [9, 0] }, { anchor: [1, 1] }, { rotation: 45 }]) {
      expect(restoreExpedition(JSON.stringify({ ...raw, placed: [raw.placed[0], { ...raw.placed[1], ...bad }] }))).toBeNull()
    }
  })

  it('preserves both placed and unplaced items through progression 32 → 42 → 49', () => {
    const started = session()
    const bag = place(started.inventory, 'starter-kunai', [4, 4])
    const inventory = apply(bag, { kind: 'rotate', instanceId: 'starter-kunai' })
    const first = { ...started, inventory }
    const second = advanceEquipment(first, 7, true)
    const third = advanceEquipment(second, 7, true)
    expect([first, second, third].map((run) => inventoryView(run.inventory).capacity)).toEqual([32, 42, 49])
    expect(third.inventory.bag.items).toEqual(inventory.bag.items)
    expect(third.inventory.tray).toEqual(inventory.tray)
    expect(restoreExpedition(serializeExpedition({ session: third, stageIndex: 24 }))?.session.inventory).toEqual(third.inventory)
  })

  it('places a purchased weapon using its instance ID and only charges once', () => {
    const started = session()
    const offer = started.offers.find(({ item }) => item.id === 'kunai')!
    const purchased = buyOffer(started, offer.id)
    expect(buyOffer(purchased, offer.id)).toBe(purchased)
    const inventory = place(purchased.inventory, `purchase-${offer.id}`, [2, 1])
    expect(inventory.bag.items[0]).toMatchObject({ instanceId: `purchase-${offer.id}`, itemId: 'kunai' })
    expect(inventory.tray.map(({ id }) => id)).toContain('starter-kunai')
  })

  it('uses the real engine fusion to replace exactly two instances and restores the result', () => {
    const inventory = place(setup('rasenshuriken', 'kurama-rasenshuriken', 'kunai'), 'rasenshuriken-instance', [1, 1])
    const result = editInventory(inventory, { kind: 'place', instanceId: 'kurama-rasenshuriken-instance', anchor: [3, 1] })
    if (!result.ok) throw new Error(result.error)
    expect(result.fusion?.item.id).toBe('baryon-mode')
    const fused = result.inventory
    expect(fused.bag.items.map(({ itemId }) => itemId)).toEqual(['baryon-mode'])
    expect(fused.tray.map(({ item }) => item.id)).toEqual(['kunai'])
    expect(editInventory(fused, { kind: 'rotate', instanceId: 'rasenshuriken-instance' }).ok).toBe(false)
    expect(restoreExpedition(serializeExpedition({ session: { ...session(), inventory: fused }, stageIndex: 0 }))?.session.inventory).toEqual(fused)
  })

  it.each(['victory', 'defeat'] as const)('blocks edits and shop purchases during real combat and retains the bag after %s', (outcome) => {
    vi.useFakeTimers()
    const started = session()
    const armed = place(started.inventory, 'starter-kunai', [2, 1])
    const inventory = outcome === 'victory'
      ? place({ ...armed, tray: [...armed.tray, ...setup('shadow-clones').tray] }, 'shadow-clones-instance', [5, 3])
      : armed
    const locked = { ...inventory, bag: setInventoryCombatLock(inventory.bag, true) }
    const commands: InventoryCommand[] = [
      { kind: 'move', instanceId: 'starter-kunai', anchor: [3, 3] },
      { kind: 'rotate', instanceId: 'starter-kunai' },
      { kind: 'place', instanceId: 'starter-basic-shield', anchor: [4, 4] },
    ]
    for (const command of commands) expect(editInventory(locked, command)).toEqual({
      ok: false, error: 'La mochila está bloqueada durante el combate.',
    })
    const lockedSession = { ...started, inventory: locked }
    expect(buyOffer(lockedSession, started.offers[0].id)).toBe(lockedSession)
    const updates: CombatUpdate[] = []
    liveCombat.startCombat({ character: 'naruto', stage: stagesFor('naruto')[0], inventory: locked.bag },
      (update) => updates.push(update), new AbortController().signal)
    vi.runAllTimers()
    expect(updates.at(-1)).toMatchObject({ status: 'finished', report: { outcome } })
    expect(setInventoryCombatLock(locked.bag, false)).toEqual(inventory.bag)
  })
})
