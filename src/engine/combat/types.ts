import type { ActiveEffect, GameEffect } from '../effects/types'

export type CombatStatus = 'running' | 'victory' | 'defeat' | 'timeout'

export type BonusHit = { kind: 'physical' | 'energy' | 'clone'; damage: number }

export interface WeaponDefinition {
  /** Stable identifier for this weapon within its owner's loadout. */
  id: string
  damage: number
  /** Time between automatic attacks, in milliseconds. Must be greater than 0. */
  cooldownMs: number
  bonusHits?: readonly BonusHit[]
}

export interface CombatantDefinition {
  id: string
  maxHealth: number
  initialHealth?: number
  armor?: number
  maxShield?: number
  supports?: readonly CombatSupport[]
  openingEffects?: readonly Extract<GameEffect, { kind: 'damageBoost' }>[]
  weapons: readonly WeaponDefinition[]
}

export interface CombatantState {
  id: string
  maxHealth: number
  health: number
  armor: number
  maxShield: number
  shield: number
  activeEffects: readonly ActiveEffect[]
  supports: readonly CombatSupport[]
  weapons: WeaponState[]
}

export interface WeaponState extends WeaponDefinition {
  remainingCooldownMs: number
}

export type ResolvedAttack = {
  source: 'player' | 'enemy'
  weaponId: string
  damage: number
  absorbed?: number
  critical?: boolean
  bonusHit?: BonusHit['kind']
  lethal: boolean
}

export type CombatSupport = {
  id: string
  name: string
  threshold: number
  strictThreshold?: boolean
  effects: readonly GameEffect[]
}

export type ResolvedSupport = { target: 'player' | 'enemy'; name: string; healed: number; buff: boolean; damageBoost?: boolean }

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
