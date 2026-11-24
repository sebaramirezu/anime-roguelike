export const heroSpriteTargets = [
  { id: 'goku-base', character: 'goku', name: 'Goku', path: 'src/assets/heroes/goku/base.pixel.png' },
  { id: 'goku-ultra-instinct', character: 'goku', name: 'Goku en Migatte no Gokui', path: 'src/assets/heroes/goku/ultra-instinct.pixel.png' },
  { id: 'naruto-base', character: 'naruto', name: 'Naruto', path: 'src/assets/heroes/naruto/base.pixel.png' },
  { id: 'naruto-baryon', character: 'naruto', name: 'Naruto en Modo Barión', path: 'src/assets/heroes/naruto/baryon.pixel.png' },
] as const

export type HeroSpriteId = typeof heroSpriteTargets[number]['id']
