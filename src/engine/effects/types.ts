export type GameEffect =
  | { kind: 'heal'; maxHealthPercent: number }
  | { kind: 'cooldownReduction'; percent: number; durationMs: number; mode?: 'duration' }
  | { kind: 'damageBoost'; percent: number; durationMs: number; weaponId?: string }
  | { kind: 'statBonus'; stat: 'maxHealth' | 'defense' | 'shield'; amount: number }

export interface EffectTarget {
  maxHealth: number
  health: number
  weaponCooldownsMs: readonly number[]
  activeEffects: readonly ActiveEffect[]
}

export type ActiveEffect = { remainingMs: number } & (
  /** Remaining cooldowns recharge at this fraction of their normal rate. */
  | { kind: 'cooldownReduction'; cooldownRateMultiplier: number }
  | { kind: 'damageBoost'; damageMultiplier: number; weaponId?: string }
)
