import type { ActiveEffect, EffectTarget, GameEffect } from './types'

export interface EffectApplication {
  target: EffectTarget
  healed: number
}

function rechargeMultiplier({ percent, mode }: Extract<GameEffect, { kind: 'cooldownReduction' }>): number {
  return mode === 'duration' ? 1 / (1 - Math.min(percent, 90) / 100) : 1 + percent / 100
}

export function applyEffects(target: EffectTarget, effects: readonly GameEffect[], sourceId?: string): EffectApplication {
  let health = target.health
  let healed = 0
  const activeEffects = [...target.activeEffects]
  const source = sourceId === undefined ? {} : { sourceId }

  for (const effect of effects) {
    if (effect.kind === 'heal') {
      if (!Number.isFinite(effect.maxHealthPercent) || effect.maxHealthPercent < 0) {
        throw new Error('Healing percentage must be a non-negative finite number.')
      }
      const amount = Math.min(target.maxHealth - health, target.maxHealth * effect.maxHealthPercent / 100)
      health += amount
      healed += amount
    } else if (effect.kind === 'cooldownReduction') {
      if (!Number.isFinite(effect.percent) || effect.percent < 0 || !Number.isFinite(effect.durationMs) || effect.durationMs <= 0) {
        throw new Error('Cooldown reduction must have a non-negative percentage and positive duration.')
      }
      activeEffects.push({
        kind: 'cooldownReduction', cooldownRateMultiplier: rechargeMultiplier(effect),
        remainingMs: effect.durationMs, ...source,
      })
    } else if (effect.kind === 'damageBoost') {
      if (!Number.isFinite(effect.percent) || effect.percent < 0 || !Number.isFinite(effect.durationMs) || effect.durationMs <= 0) {
        throw new Error('Damage boost must have a non-negative percentage and positive duration.')
      }
      activeEffects.push({
        kind: 'damageBoost', damageMultiplier: 1 + effect.percent / 100,
        remainingMs: effect.durationMs, weaponId: effect.weaponId, ...source,
      })
    } else if (effect.kind === 'damageReduction') {
      if (!Number.isFinite(effect.percent) || effect.percent < 0 || effect.percent >= 100 || !Number.isFinite(effect.durationMs) || effect.durationMs <= 0) {
        throw new Error('Damage reduction must be below 100 percent and have positive duration.')
      }
      activeEffects.push({
        kind: 'damageReduction', receivedMultiplier: 1 - effect.percent / 100, remainingMs: effect.durationMs, ...source,
      })
    }
  }

  return { target: { ...target, health, activeEffects }, healed }
}

export function cooldownRate(effects: readonly ActiveEffect[]): number {
  return effects.reduce((rate, effect) => effect.kind === 'cooldownReduction' ? Math.max(rate, effect.cooldownRateMultiplier) : rate, 1)
}

export function damageMultiplier(effects: readonly ActiveEffect[], weaponId: string): number {
  return effects.reduce((multiplier, effect) => effect.kind === 'damageBoost' && (!effect.weaponId || effect.weaponId === weaponId)
    ? Math.max(multiplier, effect.damageMultiplier) : multiplier, 1)
}

export function receivedDamageMultiplier(effects: readonly ActiveEffect[]): number {
  return effects.reduce((multiplier, effect) => effect.kind === 'damageReduction'
    ? Math.min(multiplier, effect.receivedMultiplier) : multiplier, 1)
}

export function isEffectCovered(effect: GameEffect, activeEffects: readonly ActiveEffect[]): boolean {
  if (effect.kind === 'cooldownReduction') return activeEffects.some((active) => active.kind === 'cooldownReduction'
    && active.cooldownRateMultiplier >= rechargeMultiplier(effect))
  if (effect.kind === 'damageReduction') return activeEffects.some((active) => active.kind === 'damageReduction'
    && active.receivedMultiplier <= 1 - effect.percent / 100)
  if (effect.kind === 'damageBoost') return activeEffects.some((active) => active.kind === 'damageBoost'
    && active.weaponId === effect.weaponId && active.damageMultiplier >= 1 + effect.percent / 100)
  return false
}

/** Advances temporary effects and weapon cooldowns without browser timers. */
export function advanceEffects(target: EffectTarget, deltaMs: number): EffectTarget {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('deltaMs must be non-negative.')
  const boundaries = [...new Set([0, deltaMs, ...target.activeEffects
    .map(({ remainingMs }) => Math.min(deltaMs, remainingMs))])].sort((a, b) => a - b)
  let cooldownProgressMs = 0
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i] ?? 0
    const end = boundaries[i + 1] ?? start
    const multiplier = cooldownRate(target.activeEffects.filter(({ remainingMs }) => remainingMs > start))
    cooldownProgressMs += (end - start) * multiplier
  }
  const activeEffects: ActiveEffect[] = target.activeEffects.flatMap((effect) => {
    const remainingMs = effect.remainingMs - deltaMs
    return remainingMs > 0 ? [{ ...effect, remainingMs }] : []
  })
  return {
    ...target,
    activeEffects,
    weaponCooldownsMs: target.weaponCooldownsMs.map((cooldown) => Math.max(0, cooldown - cooldownProgressMs)),
  }
}
