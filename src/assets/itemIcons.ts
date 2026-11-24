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

type BackpackArt = {
  fit?: 'contain' | 'cover' | 'stretch'
  angle?: number
  scale?: number | readonly [number, number]
  offset?: string
}

// The package's PNG filenames and proportional fits in the unrotated backpack.
const fusionArt = new Map<string, { file: string; backpack?: BackpackArt }>([
  ['superior-potion', { file: 'superior-potion', backpack: { scale: 1.04 } }],
  ['reinforced-shield', { file: 'reinforced-shield', backpack: { scale: 1.04 } }],
  ['vital-barrier', { file: 'vital-barrier', backpack: { scale: 1.05 } }],
  ['armored-cuirass', { file: 'armored-cuirass', backpack: { scale: 1.04 } }],
  ['guardian-bracers', { file: 'guardian-bracers', backpack: { scale: 1.16 } }],
  ['vital-helmet', { file: 'vital-helmet', backpack: { scale: 1.05 } }],
  ['bastion-armor', { file: 'bastion-armor', backpack: { scale: 1.04 } }],
  ['guardian-relic', { file: 'guardian-relic', backpack: { angle: -15, scale: 0.9, offset: '-6% 8%' } }],
  ['energized-power-pole', { file: 'energized-staff', backpack: { angle: -42, scale: 1.54, offset: '5% 0' } }],
  ['double-ki-burst', { file: 'double-ki-barrage', backpack: { angle: 16, scale: 1.48, offset: '0 -2%' } }],
  ['kaioken-power-pole', { file: 'kaioken-staff', backpack: { angle: -50, scale: 0.94, offset: '-13% 6%' } }],
  ['empowered-kamehameha', { file: 'empowered-kamehameha', backpack: { scale: 1.04 } }],
  ['superior-saiyan-armor', { file: 'superior-saiyan-armor', backpack: { scale: 1.04 } }],
  ['twin-kunai', { file: 'twin-kunai', backpack: { angle: 32, scale: 1.38, offset: '0 -1%' } }],
  ['shadow-kunai', { file: 'shadow-kunai', backpack: { scale: 1.3 } }],
  ['kyubi-clones', { file: 'kyubi-clones', backpack: { angle: 18, scale: 0.9, offset: '-12% 10%' } }],
  ['kyubi-rasengan', { file: 'kyubi-rasengan', backpack: { scale: 1.13 } }],
  ['endurance-vest', { file: 'resistance-vest', backpack: { scale: 1.2 } }],
])

function iconSources(svg: string, png = svg) {
  return { svg: svgFiles[`./items/${svg}.svg`], png: pngFiles[`./items/png/${png}.png`] }
}

export const itemIcons: ReadonlyMap<string, { svg?: string; png?: string }> = new Map([
  ...Object.entries(iconFiles).map(([id, file]) => [id, iconSources(file)] as const),
  ...Array.from(fusionArt, ([id, { file }]) => [id, iconSources(id, file)] as const),
])

export function itemIconSource(id: string, failed: ReadonlySet<string>, customPng?: string) {
  const icon = itemIcons.get(id)
  const sources = fusionArt.has(id) ? [icon?.png, icon?.svg] : [icon?.svg, icon?.png]
  return [...sources, customPng].find((src) => src && !failed.has(src))
}

// These adjustments use the catalog's unrotated orientation.
const backpackArt: Partial<Record<string, BackpackArt>> = {
  'power-pole': { angle: -45, scale: 1.84 },
  kunai: { angle: 45, scale: 1.78, offset: '0 15%' },
  'ki-orbs': { fit: 'stretch', scale: [0.9, 1.04] },
  'shadow-clones': { fit: 'stretch', scale: [1, 0.9] },
  'swift-gloves': { fit: 'stretch', scale: [0.92, 1.04] },
  'completo-italiano': { fit: 'stretch', scale: [0.94, 1] },
  'basic-shield': { scale: 1.12 },
  'protective-helmet': { scale: 1.1, offset: '0 -3%' },
  'healing-potion': { scale: 1.04, offset: '0 -4%' },
  'reinforced-armor': { scale: 1.1, offset: '0 -4%' },
  rasengan: { scale: 1.1 },
  'focused-spirit-bomb': { scale: 1.3, offset: '20% -20%' },
  'kurama-rasenshuriken': { scale: 1.3, offset: '20% -20%' },
}

export function backpackItemArt(id: string, src?: string) {
  if (src && src === itemIcons.get(id)?.png) return fusionArt.get(id)?.backpack ?? backpackArt[id]
  return backpackArt[id]
}
