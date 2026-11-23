import { describe, expect, it } from 'vitest'
import {
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
} from './progression'
import type { GameSession, ProgressionConfig } from './types'

const config: ProgressionConfig = {
  initialGoldByLevel: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
  normalStageGold: 8,
  specialLevelCompletionGold: 22,
  rerollCost: 3,
}

function winStage(session: GameSession): GameSession {
  return advanceToNextStage(awardStageGold(beginStageCombat(session), config), config)
}

describe('five-level expedition progression and economy', () => {
  it('generates exactly 46 stages and assigns boss encounters correctly', () => {
    const levels = [1, 2, 3, 4, 5].map(getLevel)
    expect(levels.reduce((total, level) => total + level.stages.length, 0)).toBe(46)
    for (const level of [levels[0]!, levels[1]!, levels[3]!]) {
      expect(level.stages.filter(({ enemyType }) => enemyType === 'minorBoss').map(({ stageNumber }) => stageNumber)).toEqual([4, 8])
      expect(level.stages.at(-1)?.enemyType).toBe('majorBoss')
    }
    for (const level of [levels[2]!, levels[4]!]) {
      expect(level.stages.slice(0, 4).every(({ enemyType }) => enemyType === 'minorBoss')).toBe(true)
      expect(level.stages.at(-1)?.enemyType).toBe('majorBoss')
    }
  })

  it('exposes the notice before combat and keeps stage gold until level transition', () => {
    let session = createGameSession('goku', config)
    expect(session.phase).toBe('stageIntro')
    expect(session.stageNotice).toBe('Te queda una vida al inicio de cada etapa')
    expect(session.gold).toBe(10)
    session = beginStageCombat(session)
    session = awardStageGold(session, config)
    expect(session.gold).toBe(18)
    expect(() => awardStageGold(session, config)).toThrow()
    session = advanceToNextStage(session, config)
    expect(session.gold).toBe(18)
    expect(session.stageNumber).toBe(2)
    expect(session.phase).toBe('stageIntro')
  })

  it('only completes a level after its last stage, expands inventory, and resets gold', () => {
    let session = createGameSession('naruto', config)
    for (let stage = 0; stage < 12; stage += 1) session = winStage(session)
    expect(session.levelNumber).toBe(2)
    expect(session.completedLevels).toBe(1)
    expect(session.inventory.completedLevels).toBe(1)
    expect(session.gold).toBe(20)
    expect(session.phase).toBe('stageIntro')
    expect(() => startLevel(session, 4, config)).toThrow()
  })

  it('grants configurable special-level completion gold and resets the next wallet', () => {
    let session = createGameSession('goku', config)
    for (let stage = 0; stage < 12; stage += 1) session = winStage(session)
    for (let stage = 0; stage < 12; stage += 1) session = winStage(session)
    for (let stage = 0; stage < 4; stage += 1) session = winStage(session)
    session = beginStageCombat(session)
    session = awardStageGold(session, config)
    expect(session.gold).toBe(30 + 22)
    session = completeLevel(session, config)
    expect(session.levelNumber).toBe(4)
    expect(session.gold).toBe(40)
    expect(session.inventory.completedLevels).toBe(3)
  })

  it('allows shopping and rerolls outside combat, but blocks spending during combat', () => {
    let session = createGameSession('goku', config)
    session = { ...session, offers: [{ id: 'offer-1', itemId: 'kunai', price: 4, purchased: false }] }
    session = purchaseItem(session, 'offer-1')
    expect(session.gold).toBe(6)
    expect(session.purchasedItems).toEqual([{ instanceId: 'offer-1', itemId: 'kunai' }])
    session = rerollShop(session, config, [{ id: 'offer-2', itemId: 'shield', price: 5, purchased: false }])
    expect(session.gold).toBe(3)
    expect(session.rerollCount).toBe(1)
    session = { ...session, offers: [{ id: 'offer-3', itemId: 'helmet', price: 1, purchased: false }] }
    expect(() => purchaseItem(beginStageCombat(session), 'offer-3')).toThrow()
  })

  it('marks defeat terminal and prevents a new stage combat', () => {
    const session = resolveStageDefeat(beginStageCombat(createGameSession('naruto', config)))
    expect(session.phase).toBe('defeat')
    expect(() => beginStageCombat(session)).toThrow()
    expect(getCurrentStage(session).stageNumber).toBe(1)
  })
})
