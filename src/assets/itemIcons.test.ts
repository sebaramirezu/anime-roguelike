import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ItemIcon } from '../components/inventory/ItemIcon'
import { FusionGuide } from '../components/inventory/FusionGuide'
import { items } from '../data/items'
import { itemIcons, itemIconSource } from './itemIcons'

describe('bundled inventory art', () => {
  it('maps all 20 pairs to real catalogue IDs and leaves character PNGs out', () => {
    expect(itemIcons.size).toBe(20)
    for (const [id, { svg, png }] of itemIcons) {
      expect(items.some((item) => item.id === id)).toBe(true)
      expect(svg).toMatch(/\.svg/)
      expect(png).toMatch(/\.png/)
      expect(png).not.toMatch(/gokufase|naruto/)
    }
    expect(itemIcons.get('power-pole')?.svg).toMatch(/staff\.svg/)
    expect(itemIcons.get('kurama-rasenshuriken')?.svg).toMatch(/rasenshuriken-kurama\.svg/)
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

  it('renders the six recipe illustrations as bundled images', () => {
    const html = renderToStaticMarkup(createElement(FusionGuide, { placed: [], tray: [] }))
    expect(html.match(/<img\b/g)).toHaveLength(6)
    expect(html).toContain(itemIcons.get('baryon-mode')?.svg)
  })
})
