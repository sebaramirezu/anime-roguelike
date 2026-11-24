import gokuBase from './items/png/gokufase1.png'
import gokuInstinct from './items/png/gokufase2.png'
import narutoBase from './items/png/narutofase1.png'
import narutoAlternate from './items/png/naruto1-removebg-preview.png'
import narutoKyubi from './items/png/naruto2.png'
import narutoChakraStudy from './items/png/naruto3-removebg-preview.png'
import type { HeroForm } from '../data/heroForms'
import type { CharacterId } from '../data/items'
import { heroSpriteTargets, type HeroSpriteId } from './heroSpritePaths'

type Artwork = { src: string; pixelArt?: true }
type HeroSprites = {
  base: Artwork
  forms: Partial<Record<HeroForm, Artwork>>
  references: readonly (Artwork & { label: string })[]
}

const localPngs = import.meta.glob<string>('/src/assets/heroes/*/*.pixel.png', {
  eager: true, query: '?url', import: 'default',
})
const pixelArt = new Map<HeroSpriteId, Artwork>(heroSpriteTargets.flatMap(({ id, path }) => {
  const src = localPngs[`/${path}`]
  return src ? [[id, { src, pixelArt: true }]] : []
}))
const goku = pixelArt.get('goku-base') ?? { src: gokuBase }
const instinct = pixelArt.get('goku-ultra-instinct') ?? { src: gokuInstinct }
const narutoPixel = pixelArt.get('naruto-base')
const baryon = pixelArt.get('naruto-baryon')

export const heroSprites: Record<CharacterId, HeroSprites> = {
  goku: {
    base: goku,
    forms: { 'ultra-instinct': instinct },
    references: [
      { ...goku, label: 'Forma base' },
      { ...instinct, label: 'Migatte no Gokui' },
    ],
  },
  naruto: {
    base: narutoPixel ?? { src: narutoBase },
    forms: { 'nine-tails-chakra': { src: narutoKyubi }, 'baryon-mode': baryon },
    references: [
      narutoPixel ? { ...narutoPixel, label: 'Forma base' } : { src: narutoAlternate, label: 'Pose base alternativa' },
      ...(baryon ? [{ ...baryon, label: 'Modo Barión' }] : []),
      { src: narutoChakraStudy, label: 'Manto dorado de chakra' },
    ],
  },
}
