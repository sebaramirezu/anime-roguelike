import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { editInventory } from '../../data/expeditionInventory'
import { items, type Cell } from '../../data/items'
import { createInventory, placeItem, type Rotation } from '../../engine'
import { Backpack } from './Backpack'

function renderArtwork(id: string, rotation: Rotation = 0, shape?: readonly Cell[]) {
  const item = items.find((entry) => entry.id === id)!
  const inventory = {
    bag: placeItem(createInventory(), { ...item, shape: shape ?? item.shape }, 'fixture', [1, 1], rotation),
    tray: [],
  }
  const html = renderToStaticMarkup(createElement(Backpack, {
    inventory,
    onCommand: (command) => editInventory(inventory, command),
  }))
  const layers = html.match(/<div class="inventory-artwork"[^>]*>.*?<\/div>/g) ?? []
  expect(layers).toHaveLength(1)
  const artwork = layers[0]!
  expect(artwork.match(/<img\b/g)).toHaveLength(1)
  return artwork
}

describe('backpack artwork', () => {
  it.each([
    { id: 'power-pole', rotation: 0, width: 1, height: 2 },
    { id: 'power-pole', rotation: 90, width: 2, height: 1 },
    { id: 'healing-potion', rotation: 0, width: 1, height: 1 },
    { id: 'kamehameha', rotation: 0, width: 2, height: 2 },
  ] as const)('spans $width × $height for $id at $rotation°', ({ id, rotation, width, height }) => {
    const artwork = renderArtwork(id, rotation)
    expect(artwork).toContain(`grid-column:2 / span ${width};grid-row:2 / span ${height}`)
    expect(artwork).toContain(`rotate:${rotation}deg`)
    expect(artwork).not.toContain('mask:')
  })

  it('takes the visual bounds from the occupied cells of the instance', () => {
    const artwork = renderArtwork('ki-orbs', 0, [[0, 0], [1, 0], [2, 0]])
    expect(artwork).toContain('grid-column:2 / span 3;grid-row:2 / span 1')
  })

  it('masks the artwork to the occupied cells of a rotated irregular shape', () => {
    const artwork = renderArtwork('kaioken', 270)
    expect(artwork).toContain('grid-column:2 / span 2;grid-row:2 / span 2')
    expect(artwork.match(/linear-gradient\(/g)).toHaveLength(3)
  })
})
