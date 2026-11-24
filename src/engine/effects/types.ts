export type GameEffect =
  | { kind: 'heal'; maxHealthPercent: number }
  | { kind: 'cooldownReduction'; percent: number; durationMs: number; mode?: 'duration' }
  | { kind: 'damageBoost'; percent: number; durationMs: number; weaponId?: string }
  | { kind: 'damageReduction'; percent: number; durationMs: number }
  | { kind: 'statBonus'; stat: 'maxHealth' | 'defense' | 'shield'; amount: number }

export interface EffectTarget {
  maxHealth: number
  health: number
  weaponCooldownsMs: readonly number[]
  activeEffects: readonly ActiveEffect[]
}

export type ActiveEffect = { remainingMs: number; sourceId?: string } & (
  /** Remaining cooldowns recharge at this fraction of their normal rate. */
  | { kind: 'cooldownReduction'; cooldownRateMultiplier: number }
  | { kind: 'damageBoost'; damageMultiplier: number; weaponId?: string }
  | { kind: 'damageReduction'; receivedMultiplier: number }
)
