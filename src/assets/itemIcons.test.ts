import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ItemIcon } from '../components/inventory/ItemIcon'
import { FusionGuide } from '../components/inventory/FusionGuide'
import { Backpack } from '../components/inventory/Backpack'
import { startEquipmentSession } from '../data/equipmentSession'
import { createInventory, placeItem, type Cell } from '../engine'
import { ArsenalScreen, ShopScreen } from '../screens/EquipmentScreens'
import { fusionRecipes } from '../data/fusionRecipes'
import { items } from '../data/items'
import { backpackItemArt, itemIcons, itemIconSource } from './itemIcons'
import { itemIconTargets } from './itemIconPaths'

describe('bundled inventory art', () => {
  it('maps all item art to catalogue IDs and leaves character PNGs out', () => {
    expect(itemIcons.size).toBe(41)
    for (const [id, { svg, png }] of itemIcons) {
      expect(items.some((item) => item.id === id)).toBe(true)
      expect(svg).toMatch(/\.svg/)
      if (png) {
        expect(png).toMatch(/\.png/)
        expect(png).not.toMatch(/gokufase|naruto/)
      }
    }
    const newPngs = itemIconTargets.filter(({ id }) => itemIcons.get(id)?.png).length
    expect([...itemIcons.values()].filter(({ png }) => png)).toHaveLength(38 + newPngs)
    expect(itemIcons.get('power-pole')?.svg).toMatch(/staff\.svg/)
    expect(itemIcons.get('kurama-rasenshuriken')?.svg).toMatch(/rasenshuriken-kurama\.svg/)
  })

  it('prefers a distinct PNG for every new fusion result and falls back to its SVG', () => {
    const manifestAliases: Record<string, string> = {
      'energized-power-pole': 'energized-staff',
      'double-ki-burst': 'double-ki-barrage',
      'kaioken-power-pole': 'kaioken-staff',
      'endurance-vest': 'resistance-vest',
    }
    const outcomes = fusionRecipes.map(({ result }) => items.find(({ id }) => id === result)!)
    const newOutcomes = outcomes.filter(({ level }) => level < 6)
    expect(newOutcomes).toHaveLength(18)
    const pngSources = new Set<string>()
    for (const { id } of newOutcomes) {
      const { svg, png } = itemIcons.get(id)!
      expect(svg).toContain(`${id}.svg`)
      expect(png).toContain(`${manifestAliases[id] ?? id}.png`)
      expect(itemIconSource(id, new Set())).toBe(png)
      expect(itemIconSource(id, new Set([png!]))).toBe(svg)
      expect(backpackItemArt(id, png)?.scale).toEqual(expect.any(Number))
      expect(backpackItemArt(id, svg)).toBeUndefined()
      pngSources.add(png!)
    }
    expect(pngSources.size).toBe(18)
  })

  it.each(['ultra-instinct', 'baryon-mode'])('keeps the original art for %s', (id) => {
    const { svg, png } = itemIcons.get(id)!
    expect(svg).toContain(`${id}.svg`)
    expect(png).toContain(`${id}.png`)
    expect(itemIconSource(id, new Set())).toBe(svg)
  })

  it('uses SVG, then the supplied PNG, then the existing symbol', () => {
    const { svg, png } = itemIcons.get('power-pole')!
    expect(itemIconSource('power-pole', new Set())).toBe(svg)
    expect(itemIconSource('power-pole', new Set([svg!]))).toBe(png)
    expect(itemIconSource('power-pole', new Set([svg!, png!]))).toBeUndefined()
    const fallback = items.find(({ id }) => id === 'chunin-vest')!
    const html = renderToStaticMarkup(createElement(ItemIcon, { item: fallback }))
    expect(html).toContain(fallback.icon)
    expect(html).not.toContain('<img')
  })

  it('renders the available bundled illustrations for the full fusion guide', () => {
    const html = renderToStaticMarkup(createElement(FusionGuide, { placed: [], tray: [] }))
    const illustrations = fusionRecipes.flatMap(({ ingredients, result }) => [...ingredients, result])
      .flatMap((id) => itemIconSource(id, new Set()) ?? [])
    expect(html.match(/<img\b/g)).toHaveLength(illustrations.length)
    for (const src of illustrations) expect(html).toContain(`src="${src}"`)
  })

  it('uses distinct art for the three Saiyan items across shop, backpack, arsenal and fusion results', () => {
    const gear = itemIconTargets.map(({ id }) => items.find((item) => item.id === id)!)
    const anchors: readonly Cell[] = [[1, 2], [3, 3], [1, 0]]
    const bag = gear.reduce((inventory, item, index) => placeItem(inventory, item, item.id, anchors[index]), createInventory())
    const inventory = { bag, tray: [] }
    const session = startEquipmentSession('goku', ['power-pole', 'basic-shield'].map((id) => items.find((item) => item.id === id)!))!
    const offers = gear.map((item) => ({ id: item.id, item, price: item.price!, sold: false }))
    const noop = () => {}
    const shop = renderToStaticMarkup(createElement(ShopScreen, { session: { ...session, inventory, offers }, onBack: noop, onBuy: noop, onRefresh: noop }))
    const arsenal = renderToStaticMarkup(createElement(ArsenalScreen, { character: 'goku', onSelect: noop, onBack: noop }))
    const backpack = renderToStaticMarkup(createElement(Backpack, { character: 'goku', inventory, onCommand: () => ({ ok: true as const, inventory }) }))
    const guide = renderToStaticMarkup(createElement(FusionGuide, { character: 'goku' }))
    for (const { id } of gear) {
      const icon = itemIcons.get(id)!
      expect(icon.svg).toContain(`${id}.svg`)
      const selected = itemIconSource(id, new Set())
      expect(selected).toBe(icon.png ?? icon.svg)
      expect(itemIconSource(id, new Set(['/item.png', ...(icon.png ? [icon.png] : [])]), '/item.png')).toBe(icon.svg)
      for (const html of [shop, arsenal, backpack]) expect(html).toContain(`data-item-icon="${id}" data-pixel-art="true"><img src="${selected}"`)
    }
    expect(guide).toContain(`src="${itemIconSource('saiyan-armor', new Set())}"`)
    expect(guide).toContain(`src="${itemIconSource('vitality-orb', new Set())}"`)
    expect(guide).toContain(`src="${itemIconSource('superior-saiyan-armor', new Set())}"`)
    expect(guide).not.toContain('data-item-icon="ki-barrier"')
  })
})
