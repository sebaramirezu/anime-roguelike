export type CombatStatus = 'running' | 'victory' | 'defeat' | 'timeout'

export interface WeaponDefinition {
  /** Stable identifier for this weapon within its owner's loadout. */
  id: string
  damage: number
  /** Time between automatic attacks, in milliseconds. Must be greater than 0. */
  cooldownMs: number
}

export interface CombatantDefinition {
  id: string
  maxHealth: number
  weapons: readonly WeaponDefinition[]
}

export interface CombatantState {
  id: string
  maxHealth: number
  health: number
  weapons: WeaponState[]
}

export interface WeaponState extends WeaponDefinition {
  remainingCooldownMs: number
}

export interface CombatState {
  player: CombatantState
  enemy: CombatantState
  elapsedMs: number
  status: CombatStatus
  /** Safety limit for one encounter, in milliseconds. */
  maxDurationMs: number
}

export interface CombatResult {
  status: Exclude<CombatStatus, 'running'>
  winnerId: string | null
  loserId: string | null
  elapsedMs: number
}

export interface CreateCombatOptions {
  player: CombatantDefinition
  enemy: CombatantDefinition
  maxDurationMs?: number
}
