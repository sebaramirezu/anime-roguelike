import type { CharacterId } from '../data/items'
import type { HeroForm } from '../data/heroForms'
import type { Stage } from '../data/levels'
import type { HeroProgress, InventoryState } from '../engine'

export type Stats = {
  damage?: number
  armor?: number
  critPercent?: number
  lifestealPercent?: number
  thorns?: number
  regeneration?: number
}

export type Combatant = {
  health?: number
  maxHealth?: number
  shield?: number
  maxShield?: number
  visualForm?: HeroForm
  progression?: { level: number; xp: number; xpNeeded: number }
  bonuses?: { maxHealth: number; armor: number; maxShield: number }
  stats?: Stats
  effects?: readonly { id: string; name: string; kind: 'buff' | 'debuff'; remainingSeconds?: number; description?: string }[]
  weapons?: readonly { id: string; name: string; remainingSeconds: number; totalSeconds: number }[]
}

export type CombatEvent = {
  id: string
  text: string
  kind: 'attack' | 'damage' | 'heal' | 'shield' | 'effect' | 'transform' | 'death'
  target: 'player' | 'enemy'
  source?: 'player' | 'enemy'
  techniqueId?: string
  visual?: { theme: string; special?: boolean }
  amount?: number
  critical?: boolean
}

export type CombatReport = {
  outcome: 'victory' | 'defeat' | 'timeout'
  health?: number
  maxHealth?: number
  damageDealt?: number
  damageTaken?: number
  healing?: number
  lifestealHealing?: number
  shieldBlocked?: number
  shieldDamageDealt?: number
  thornsDamage?: number
  attacks?: number
  criticals?: number
  buffs?: readonly string[]
  debuffs?: readonly string[]
  durationSeconds?: number
  gold?: number
  xpGained?: number
  levelsGained?: number
  healthIncrease?: number
  damageIncrease?: number
  enemyWeakness?: string
}

export type CombatUpdate = {
  player?: Combatant
  enemy?: Combatant
  recentEvents?: readonly CombatEvent[]
} & ({ status: 'running' } | { status: 'finished'; report: CombatReport })

export type CombatRequest = {
  character: CharacterId
  stage: Stage
  inventory: InventoryState
  hero?: HeroProgress
}

export interface GameEngineAdapter {
  // Publish full snapshots and a single terminal report. Stop publishing after abort.
  startCombat(request: CombatRequest, publish: (update: CombatUpdate) => void, signal: AbortSignal): void | Promise<void>
}
