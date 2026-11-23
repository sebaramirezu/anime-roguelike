import type { InventoryState } from '../inventory/types'

export type LevelNumber = 1 | 2 | 3 | 4 | 5
export type LevelType = 'normal' | 'special'
export type EnemyType = 'normal' | 'minorBoss' | 'majorBoss'
export type SessionPhase = 'stageIntro' | 'combat' | 'stageComplete' | 'defeat' | 'victory'

export interface Stage {
  levelNumber: LevelNumber
  stageNumber: number
  levelType: LevelType
  enemyType: EnemyType
  key: string
}

export interface Level {
  levelNumber: LevelNumber
  type: LevelType
  stages: readonly Stage[]
}

export interface ShopOffer {
  id: string
  itemId: string
  price: number
  purchased: boolean
}

export interface PurchasedItem {
  instanceId: string
  itemId: string
}

export interface GameSession {
  characterId: string
  levelNumber: LevelNumber
  stageNumber: number
  completedLevels: number
  phase: SessionPhase
  gold: number
  inventory: InventoryState
  offers: readonly ShopOffer[]
  purchasedItems: readonly PurchasedItem[]
  rewardedStageKeys: readonly string[]
  rerollCount: number
  stageNotice: string
}

export interface ProgressionConfig {
  initialGoldByLevel: Readonly<Record<LevelNumber, number>>
  normalStageGold: number
  specialLevelCompletionGold: number
  rerollCost: number
}
