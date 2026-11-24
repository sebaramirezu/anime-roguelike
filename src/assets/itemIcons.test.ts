import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ItemIcon } from '../components/inventory/ItemIcon'
import { FusionGuide } from '../components/inventory/FusionGuide'
import { fusionRecipes } from '../data/fusionRecipes'
import { items } from '../data/items'
import { backpackItemArt, itemIcons, itemIconSource } from './itemIcons'

describe('bundled inventory art', () => {
  it('maps all item art to catalogue IDs and leaves character PNGs out', () => {
    expect(itemIcons.size).toBe(38)
    for (const [id, { svg, png }] of itemIcons) {
      expect(items.some((item) => item.id === id)).toBe(true)
      expect(svg).toMatch(/\.svg/)
      if (png) {
        expect(png).toMatch(/\.png/)
        expect(png).not.toMatch(/gokufase|naruto/)
      }
    }
    expect([...itemIcons.values()].filter(({ png }) => png)).toHaveLength(38)
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
})
