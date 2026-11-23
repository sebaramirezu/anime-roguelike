import { getInventoryCapacity } from '../inventory/capacity'
import { createInventory, withCompletedLevels } from '../inventory/inventory'
import type { InventoryState } from '../inventory/types'
import type { EnemyType, GameSession, Level, LevelNumber, ProgressionConfig, ShopOffer, Stage } from './types'

export const STAGE_START_NOTICE = 'Te queda una vida al inicio de cada etapa'

const LEVEL_TYPES: readonly LevelType[] = ['normal', 'normal', 'special', 'normal', 'special']
type LevelType = 'normal' | 'special'

export function getLevel(levelNumber: number): Level {
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 5) {
    throw new Error('levelNumber must be an integer from 1 to 5.')
  }
  const level = levelNumber as LevelNumber
  const type = LEVEL_TYPES[level - 1]
  if (!type) throw new Error('Invalid level configuration.')
  const stageCount = type === 'normal' ? 12 : 5
  const stages: Stage[] = Array.from({ length: stageCount }, (_, index) => {
    const stageNumber = index + 1
    let enemyType: EnemyType = 'normal'
    if (type === 'normal') {
      if (stageNumber === 12) enemyType = 'majorBoss'
      else if (stageNumber === 4 || stageNumber === 8) enemyType = 'minorBoss'
    } else {
      enemyType = stageNumber === 5 ? 'majorBoss' : 'minorBoss'
    }
    return { levelNumber: level, stageNumber, levelType: type, enemyType, key: `${level}-${stageNumber}` }
  })
  return { levelNumber: level, type, stages }
}

function validateConfig(config: ProgressionConfig): void {
  for (const amount of [...Object.values(config.initialGoldByLevel), config.normalStageGold, config.specialLevelCompletionGold, config.rerollCost]) {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Economy values must be non-negative finite numbers.')
  }
}

export function createGameSession(
  characterId: string,
  config: ProgressionConfig,
  inventory: InventoryState = createInventory(),
): GameSession {
  if (!characterId) throw new Error('characterId is required.')
  validateConfig(config)
  const normalizedInventory = withCompletedLevels(inventory, 0)
  return {
    characterId,
    levelNumber: 1,
    stageNumber: 1,
    completedLevels: 0,
    phase: 'stageIntro',
    gold: config.initialGoldByLevel[1],
    inventory: normalizedInventory,
    offers: [],
    purchasedItems: [],
    rewardedStageKeys: [],
    rerollCount: 0,
    stageNotice: STAGE_START_NOTICE,
  }
}

export function startLevel(
  session: GameSession,
  levelNumber: number,
  config: ProgressionConfig,
  offers: readonly ShopOffer[] = [],
): GameSession {
  validateConfig(config)
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 5) throw new Error('levelNumber must be from 1 to 5.')
  if (session.phase !== 'stageComplete' || session.stageNumber !== getLevel(session.levelNumber).stages.length
    || levelNumber !== session.levelNumber + 1) {
    throw new Error('Only the next level can start after completing the current level.')
  }
  const level = levelNumber as LevelNumber
  const completedLevels = level - 1
  getInventoryCapacity(completedLevels)
  const inventory = withCompletedLevels(session.inventory, completedLevels)
  return {
    ...session,
    levelNumber: level,
    stageNumber: 1,
    completedLevels,
    phase: 'stageIntro',
    gold: config.initialGoldByLevel[level],
    inventory,
    offers,
    rerollCount: 0,
    stageNotice: STAGE_START_NOTICE,
  }
}

export function getCurrentStage(session: GameSession): Stage {
  const stage = getLevel(session.levelNumber).stages[session.stageNumber - 1]
  if (!stage) throw new Error('Session stage is outside the current level.')
  return stage
}

export function beginStageCombat(session: GameSession): GameSession {
  if (session.phase !== 'stageIntro') throw new Error('A stage can start combat only from its intro state.')
  return { ...session, phase: 'combat' }
}

export function awardStageGold(session: GameSession, config: ProgressionConfig): GameSession {
  if (session.phase !== 'combat') throw new Error('Stage gold can only be awarded after an active combat.')
  const stage = getCurrentStage(session)
  if (session.rewardedStageKeys.includes(stage.key)) return session
  const reward = stage.levelType === 'normal'
    ? config.normalStageGold
    : stage.stageNumber === getLevel(stage.levelNumber).stages.length ? config.specialLevelCompletionGold : 0
  return {
    ...session,
    gold: session.gold + reward,
    phase: 'stageComplete',
    rewardedStageKeys: [...session.rewardedStageKeys, stage.key],
  }
}

export function resolveStageDefeat(session: GameSession): GameSession {
  if (session.phase !== 'combat') throw new Error('Only an active combat can defeat the expedition.')
  return { ...session, phase: 'defeat' }
}

export function purchaseItem(session: GameSession, offerId: string): GameSession {
  if (session.phase === 'combat' || session.phase === 'defeat' || session.phase === 'victory') {
    throw new Error('Items cannot be purchased in this session phase.')
  }
  const offer = session.offers.find(({ id }) => id === offerId)
  if (!offer || !Number.isFinite(offer.price) || offer.price < 0 || offer.purchased || session.gold < offer.price) {
    throw new Error('Offer is unavailable or unaffordable.')
  }
  if (session.purchasedItems.some(({ instanceId }) => instanceId === offer.id)) throw new Error('Offer was already purchased.')
  return {
    ...session,
    gold: session.gold - offer.price,
    offers: session.offers.map((entry) => entry.id === offerId ? { ...entry, purchased: true } : entry),
    purchasedItems: [...session.purchasedItems, { instanceId: offer.id, itemId: offer.itemId }],
  }
}

export function rerollShop(session: GameSession, config: ProgressionConfig, offers: readonly ShopOffer[]): GameSession {
  if (session.phase === 'combat' || session.phase === 'defeat' || session.phase === 'victory') {
    throw new Error('Shop cannot be refreshed in this session phase.')
  }
  if (session.gold < config.rerollCost) throw new Error('Not enough gold to refresh the shop.')
  return { ...session, gold: session.gold - config.rerollCost, offers, rerollCount: session.rerollCount + 1 }
}

export function completeLevel(
  session: GameSession,
  config: ProgressionConfig,
  nextOffers: readonly ShopOffer[] = [],
): GameSession {
  if (session.phase !== 'stageComplete') throw new Error('A level completes only after the final stage is won.')
  const level = getLevel(session.levelNumber)
  if (session.stageNumber !== level.stages.length) throw new Error('The current level still has unfinished stages.')
  const completedLevels = session.completedLevels + 1
  const inventory = withCompletedLevels(session.inventory, completedLevels)
  if (session.levelNumber === 5) {
    return { ...session, completedLevels, inventory, phase: 'victory', gold: 0, offers: [] }
  }
  return startLevel({ ...session, completedLevels, inventory }, session.levelNumber + 1, config, nextOffers)
}

export function advanceToNextStage(
  session: GameSession,
  config: ProgressionConfig,
  nextLevelOffers: readonly ShopOffer[] = [],
): GameSession {
  if (session.phase !== 'stageComplete') throw new Error('The stage must be won before advancing.')
  const level = getLevel(session.levelNumber)
  if (session.stageNumber === level.stages.length) return completeLevel(session, config, nextLevelOffers)
  return { ...session, stageNumber: session.stageNumber + 1, phase: 'stageIntro', stageNotice: STAGE_START_NOTICE }
}
