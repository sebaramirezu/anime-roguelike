import type { FusionRecipe } from '../engine'

export type { FusionRecipe } from '../engine'

export const fusionRecipes: readonly FusionRecipe[] = [
  { ingredients: ['healing-potion', 'healing-potion'], result: 'superior-potion' },
  { ingredients: ['basic-shield', 'basic-shield'], result: 'reinforced-shield' },
  { ingredients: ['healing-potion', 'basic-shield'], result: 'vital-barrier' },
  { ingredients: ['reinforced-armor', 'protective-helmet'], result: 'armored-cuirass' },
  { ingredients: ['swift-gloves', 'basic-shield'], result: 'guardian-bracers' },
  { ingredients: ['protective-helmet', 'healing-potion'], result: 'vital-helmet' },
  { ingredients: ['reinforced-armor', 'basic-shield'], result: 'bastion-armor' },
  { ingredients: ['superior-potion', 'reinforced-shield'], result: 'guardian-relic' },
  { ingredients: ['power-pole', 'ki-orbs'], result: 'energized-power-pole' },
  { ingredients: ['ki-orbs', 'ki-orbs'], result: 'double-ki-burst' },
  { ingredients: ['energized-power-pole', 'kaioken'], result: 'kaioken-power-pole' },
  { ingredients: ['double-ki-burst', 'kamehameha'], result: 'empowered-kamehameha' },
  { ingredients: ['vitality-orb', 'saiyan-armor'], result: 'superior-saiyan-armor' },
  { ingredients: ['spirit-bomb', 'focused-spirit-bomb'], result: 'ultra-instinct' },
  { ingredients: ['kunai', 'kunai'], result: 'twin-kunai' },
  { ingredients: ['kunai', 'shadow-clones'], result: 'shadow-kunai' },
  { ingredients: ['shadow-clones', 'nine-tails-chakra'], result: 'kyubi-clones' },
  { ingredients: ['rasengan', 'nine-tails-chakra'], result: 'kyubi-rasengan' },
  { ingredients: ['vitality-seal', 'chunin-vest'], result: 'endurance-vest' },
  { ingredients: ['rasenshuriken', 'kurama-rasenshuriken'], result: 'baryon-mode' },
]
