export type GameEffect =
  | { kind: 'heal'; maxHealthPercent: number }
  | { kind: 'cooldownReduction'; percent: number; durationMs: number; mode?: 'duration' }
  | { kind: 'statBonus'; stat: 'maxHealth' | 'defense' | 'shield'; amount: number }

export interface EffectTarget {
  maxHealth: number
  health: number
  weaponCooldownsMs: readonly number[]
  activeEffects: readonly ActiveEffect[]
}

export interface ActiveEffect {
  kind: 'cooldownReduction'
  /** Remaining cooldowns recharge at this fraction of their normal rate. */
  cooldownRateMultiplier: number
  remainingMs: number
}
