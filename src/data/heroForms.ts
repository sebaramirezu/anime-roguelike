export const heroForms = {
  goku: 'ultra-instinct',
  naruto: 'nine-tails-chakra',
} as const

export type HeroForm = typeof heroForms[keyof typeof heroForms]
