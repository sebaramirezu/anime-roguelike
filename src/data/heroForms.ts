export const heroForms = {
  goku: 'ultra-instinct',
  naruto: 'baryon-mode',
} as const

export const kyubiChakra = 'nine-tails-chakra'
export type HeroForm = typeof heroForms[keyof typeof heroForms] | typeof kyubiChakra
