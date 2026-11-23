export const heroBalance = {
  goku: { health: 1250, healthPerLevel: 105 },
  naruto: { health: 1180, healthPerLevel: 100 },
}

type HeroId = keyof typeof heroBalance
export type HeroProgress = { level: number; xp: number; health: number; lastVictory: number }

export const rpgBalance = {
  xp: { normal: 24, minor: 44, major: 80 },
  xpBase: 75, xpLinear: 30, xpQuadratic: 4,
  damagePerLevel: 0.075, recovery: 0.55,
}

export function xpForNextLevel(level: number) {
  const steps = level - 1
  return rpgBalance.xpBase + rpgBalance.xpLinear * steps + rpgBalance.xpQuadratic * steps ** 2
}

export function heroBaseStats(character: HeroId, level: number) {
  const { health, healthPerLevel } = heroBalance[character]
  return { maxHealth: health + healthPerLevel * (level - 1), damageMultiplier: 1 + rpgBalance.damagePerLevel * (level - 1) }
}

export function createHeroProgress(character: HeroId): HeroProgress {
  return { level: 1, xp: 0, health: heroBaseStats(character, 1).maxHealth, lastVictory: -1 }
}

export function awardHeroVictory(character: HeroId, hero: HeroProgress, stageIndex: number, xp: number, remainingHealth: number, equippedMaxHealth: number) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error('XP rewards must be non-negative integers.')
  if (stageIndex <= hero.lastVictory) return { hero, xpGained: 0, levelsGained: 0, healthIncrease: 0, damageIncrease: 0 }
  let level = hero.level
  let progress = hero.xp + xp
  while (progress >= xpForNextLevel(level)) {
    progress -= xpForNextLevel(level)
    level++
  }
  const levelsGained = level - hero.level
  const healthIncrease = levelsGained * heroBalance[character].healthPerLevel
  return {
    hero: { level, xp: progress, lastVictory: stageIndex, health: Math.min(equippedMaxHealth + healthIncrease, remainingHealth + healthIncrease) },
    xpGained: xp, levelsGained, healthIncrease, damageIncrease: levelsGained * rpgBalance.damagePerLevel * 100,
  }
}
