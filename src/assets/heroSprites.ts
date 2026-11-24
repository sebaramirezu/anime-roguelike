import gokuBase from './items/png/gokufase1.png'
import gokuInstinct from './items/png/gokufase2.png'
import narutoBase from './items/png/narutofase1.png'
import narutoAlternate from './items/png/naruto1-removebg-preview.png'
import narutoKyubi from './items/png/naruto2.png'
import narutoChakraStudy from './items/png/naruto3-removebg-preview.png'
import type { HeroForm } from '../data/heroForms'
import type { CharacterId } from '../data/items'

type HeroSprites = {
  base: string
  forms: Partial<Record<HeroForm, string>>
  references: readonly { src: string; label: string }[]
}

export const heroSprites: Record<CharacterId, HeroSprites> = {
  goku: {
    base: gokuBase,
    forms: { 'ultra-instinct': gokuInstinct },
    references: [
      { src: gokuBase, label: 'Forma base' },
      { src: gokuInstinct, label: 'Migatte no Gokui' },
    ],
  },
  naruto: {
    base: narutoBase,
    forms: { 'nine-tails-chakra': narutoKyubi },
    references: [
      { src: narutoAlternate, label: 'Pose base alternativa' },
      { src: narutoChakraStudy, label: 'Manto dorado de chakra' },
    ],
  },
}
