const svgFiles = import.meta.glob<string>('./items/*.svg', { eager: true, query: '?url&no-inline', import: 'default' })
const pngFiles = import.meta.glob<string>(['./items/png/*.png', '!./items/png/gokufase*.png', '!./items/png/naruto*.png'],
  { eager: true, query: '?url&no-inline', import: 'default' })

const iconFiles: Record<string, string> = {
  'power-pole': 'staff',
  'ki-orbs': 'ki-spheres',
  kaioken: 'kaioken',
  kamehameha: 'kamehameha',
  'spirit-bomb': 'genkidama',
  'focused-spirit-bomb': 'genkidama-concentrated',
  'ultra-instinct': 'ultra-instinct',
  kunai: 'kunai',
  'shadow-clones': 'shadow-clones',
  'nine-tails-chakra': 'kyubi-chakra',
  rasengan: 'rasengan',
  rasenshuriken: 'rasenshuriken',
  'kurama-rasenshuriken': 'rasenshuriken-kurama',
  'baryon-mode': 'baryon-mode',
  'completo-italiano': 'completo-italiano',
  'healing-potion': 'healing-potion',
  'basic-shield': 'basic-shield',
  'reinforced-armor': 'reinforced-armor',
  'protective-helmet': 'protective-helmet',
  'swift-gloves': 'swift-gloves',
}

export const itemIcons: ReadonlyMap<string, { svg?: string; png?: string }> = new Map(
  Object.entries(iconFiles).map(([id, file]) => [id, {
    svg: svgFiles[`./items/${file}.svg`],
    png: pngFiles[`./items/png/${file}.png`],
  }]),
)

export function itemIconSource(id: string, failed: ReadonlySet<string>, customPng?: string) {
  const icon = itemIcons.get(id)
  return [icon?.svg, icon?.png, customPng].find((src) => src && !failed.has(src))
}
