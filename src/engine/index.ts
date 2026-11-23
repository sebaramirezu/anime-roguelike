export { advanceCombat, createCombat, getCombatResult } from './combat/combat'
export type {
  CombatantDefinition,
  CombatantState,
  CombatResult,
  CombatState,
  CombatStatus,
  CreateCombatOptions,
  WeaponDefinition,
  WeaponState,
} from './combat/types'
export {
  getInventoryCapacity,
  getInventoryCells,
  getInventoryMask,
} from './inventory/capacity'
export {
  canPlaceItem,
  createInventory,
  getItemAdjacencies,
  getOccupiedCells,
  findSharedEdge,
  moveItem,
  placeItem,
  removeItem,
  rotateItem,
  rotateShape,
  setInventoryCombatLock,
  withCompletedLevels,
} from './inventory/inventory'
export type {
  InventoryCapacity,
  InventoryMask,
} from './inventory/capacity'
export type {
  Cell,
  InventoryState,
  ItemAdjacency,
  ItemInstance,
  Rotation,
  SpatialItemDefinition,
} from './inventory/types'
export { advanceEffects, applyEffects } from './effects/effects'
export type { ActiveEffect, EffectTarget, GameEffect } from './effects/types'
export { calculateSynergies } from './effects/synergies'
export type { SynergyBonus, SynergyItem, SynergyRule } from './effects/synergies'
export { canFuse, fuseItems, findFusionResult, resolveFusion } from './fusion/fusion'
export type { FusionItemDefinition, FusionRecipe, FusionRequest } from './fusion/fusion'
export {
  STAGE_START_NOTICE,
  advanceToNextStage,
  awardStageGold,
  beginStageCombat,
  completeLevel,
  createGameSession,
  getCurrentStage,
  getLevel,
  purchaseItem,
  rerollShop,
  resolveStageDefeat,
  startLevel,
} from './progression/progression'
export type {
  EnemyType,
  GameSession,
  Level,
  LevelNumber,
  LevelType,
  ProgressionConfig,
  PurchasedItem,
  SessionPhase,
  ShopOffer,
  Stage,
} from './progression/types'
