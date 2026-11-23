import type { ActiveEffect, EffectTarget, GameEffect } from './types'

export interface EffectApplication {
  target: EffectTarget
  healed: number
}

/** Cooldown reduction is a temporary faster recharge rate: 15% means 1.15x rate. */
export function applyEffects(target: EffectTarget, effects: readonly GameEffect[]): EffectApplication {
  let health = target.health
  let healed = 0
  const activeEffects = [...target.activeEffects]

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
        kind: 'cooldownReduction',
        cooldownRateMultiplier: effect.mode === 'duration' ? 1 / (1 - Math.min(effect.percent, 90) / 100) : 1 + effect.percent / 100,
        remainingMs: effect.durationMs,
      })
    }
  }

  return { target: { ...target, health, activeEffects }, healed }
}

export function cooldownRate(effects: readonly ActiveEffect[]): number {
  return effects.reduce((rate, effect) => rate * effect.cooldownRateMultiplier, 1)
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
    const multiplier = target.activeEffects
      .filter(({ remainingMs }) => remainingMs > start)
      .reduce((rate, effect) => rate * effect.cooldownRateMultiplier, 1)
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
