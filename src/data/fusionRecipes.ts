export type FusionRecipe = {
  ingredients: readonly [string, string]
  result: string
}

export const fusionRecipes: readonly FusionRecipe[] = [
  { ingredients: ['spirit-bomb', 'focused-spirit-bomb'], result: 'ultra-instinct' },
  { ingredients: ['rasenshuriken', 'kurama-rasenshuriken'], result: 'baryon-mode' },
]
