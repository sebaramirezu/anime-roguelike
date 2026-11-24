import type {
  CombatantDefinition,
  CombatantState,
  CombatResult,
  CombatState,
  CreateCombatOptions,
  ResolvedAttack,
  ResolvedSupport,
  WeaponState,
} from './types'
import { advanceEffects, applyEffects, cooldownRate, damageMultiplier, isEffectCovered, receivedDamageMultiplier } from '../effects/effects'

const DEFAULT_MAX_DURATION_MS = 120_000

function validateCombatant(combatant: CombatantDefinition, label: string): void {
  if (!combatant.id) throw new Error(`${label} must have an id.`)
  if (!Number.isFinite(combatant.maxHealth) || combatant.maxHealth <= 0) {
    throw new Error(`${label} maxHealth must be a positive finite number.`)
  }
  for (const value of [combatant.armor ?? 0, combatant.maxShield ?? 0, combatant.initialHealth ?? combatant.maxHealth]) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${label} defensive stats must be non-negative and finite.`)
  }

  const weaponIds = new Set<string>()
  for (const weapon of combatant.weapons) {
    if (!weapon.id) throw new Error(`${label} weapons must have an id.`)
    if (weaponIds.has(weapon.id)) throw new Error(`${label} weapon ids must be unique.`)
    weaponIds.add(weapon.id)
    if ([weapon, ...(weapon.bonusHits ?? [])].some(({ damage }) => !Number.isFinite(damage) || damage < 0)) {
      throw new Error(`${label} weapon damage must be a non-negative finite number.`)
    }
    if (!Number.isFinite(weapon.cooldownMs) || weapon.cooldownMs <= 0) {
      throw new Error(`${label} weapon cooldownMs must be a positive finite number.`)
    }
  }
}

function createCombatant(definition: CombatantDefinition): CombatantState {
  const state: CombatantState = {
    id: definition.id,
    maxHealth: definition.maxHealth,
    health: Math.min(definition.maxHealth, definition.initialHealth ?? definition.maxHealth),
    armor: definition.armor ?? 0,
    maxShield: definition.maxShield ?? 0,
    shield: definition.maxShield ?? 0,
    activeEffects: [],
    supports: definition.supports ?? [],
    weapons: definition.weapons.map((weapon): WeaponState => ({
      ...weapon,
      remainingCooldownMs: 0,
    })),
  }
  return definition.openingEffects?.length
    ? { ...state, activeEffects: applyEffects({ ...state, weaponCooldownsMs: [] }, definition.openingEffects).target.activeEffects }
    : state
}

export function mitigateDamage(damage: number, armor: number): number {
  return Math.max(0, damage) * (100 / (100 + Math.max(0, armor)))
}

function resolveStatus(state: CombatState): CombatState {
  if (state.player.health <= 0) {
    return { ...state, status: state.enemy.health <= 0 ? 'timeout' : 'defeat' }
  }
  if (state.enemy.health <= 0) return { ...state, status: 'victory' }
  if (state.elapsedMs >= state.maxDurationMs) return { ...state, status: 'timeout' }
  return state
}

/** Create a reproducible encounter. Weapons start ready and attack on the first advance. */
export function createCombat(options: CreateCombatOptions): CombatState {
  validateCombatant(options.player, 'Player')
  validateCombatant(options.enemy, 'Enemy')
  if (options.player.id === options.enemy.id) {
    throw new Error('Player and enemy ids must be different.')
  }
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS
  if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0) {
    throw new Error('maxDurationMs must be a positive finite number.')
  }

  return {
    player: createCombatant(options.player),
    enemy: createCombatant(options.enemy),
    elapsedMs: 0,
    status: 'running',
    maxDurationMs,
  }
}

function attackReadyWeapons(
  attacker: CombatantState,
  target: CombatantState,
  source: ResolvedAttack['source'],
  onAttack?: (attack: ResolvedAttack) => void,
): { attacker: CombatantState; target: CombatantState } {
  let updatedTarget = target
  const receivedMultiplier = receivedDamageMultiplier(target.activeEffects)
  const updatedWeapons = attacker.weapons.map((weapon) => {
    if (updatedTarget.health <= 0 || weapon.remainingCooldownMs > 1e-9) return weapon

    const multiplier = damageMultiplier(attacker.activeEffects, weapon.id)
    function hit(damage: number, bonusHit?: ResolvedAttack['bonusHit']) {
      const previousHealth = updatedTarget.health
      const mitigated = mitigateDamage(damage * multiplier, updatedTarget.armor) * receivedMultiplier
      const absorbed = Math.min(updatedTarget.shield, mitigated)
      updatedTarget = {
        ...updatedTarget,
        shield: updatedTarget.shield - absorbed,
        health: Math.max(0, updatedTarget.health - (mitigated - absorbed)),
      }
      onAttack?.({
        source, weaponId: weapon.id, damage: previousHealth - updatedTarget.health,
        ...(absorbed > 0 ? { absorbed } : {}),
        ...(bonusHit ? { bonusHit } : {}),
        lethal: previousHealth > 0 && updatedTarget.health === 0,
      })
    }
    hit(weapon.damage)
    for (const bonus of weapon.bonusHits ?? []) {
      if (updatedTarget.health <= 0) break
      hit(bonus.damage, bonus.kind)
    }
    return { ...weapon, remainingCooldownMs: weapon.cooldownMs }
  })

  return {
    attacker: { ...attacker, weapons: updatedWeapons },
    target: updatedTarget,
  }
}

function triggerSupport(state: CombatantState, target: ResolvedSupport['target'], elapsedMs: number, notify?: (event: ResolvedSupport) => void) {
  if (state.health <= 0) return state
  const support = state.supports.find(({ threshold, strictThreshold, effects }) => {
    const limit = state.maxHealth * threshold
    const reached = strictThreshold ? state.health < limit : state.health <= limit
    return reached && !effects.some((effect) => isEffectCovered(effect, state.activeEffects))
  })
  if (!support) return state
  const applied = applyEffects({ ...state, weaponCooldownsMs: [] }, support.effects, support.techniqueId)
  const buff = applied.target.activeEffects.length > state.activeEffects.length
  const damageBoost = support.effects.some(({ kind }) => kind === 'damageBoost')
  notify?.({ target, elapsedMs, name: support.name, healed: applied.healed, buff, ...(damageBoost ? { damageBoost } : {}),
    ...(support.techniqueId && { techniqueId: support.techniqueId }) })
  return {
    ...state, health: applied.target.health, activeEffects: applied.target.activeEffects,
    supports: state.supports.filter(({ id }) => id !== support.id),
  }
}

function triggerReadySupports(state: CombatantState, target: ResolvedSupport['target'], elapsedMs: number, notify?: (event: ResolvedSupport) => void) {
  let current = state
  while (current.supports.length) {
    const next = triggerSupport(current, target, elapsedMs, notify)
    if (next === current) break
    current = next
  }
  return current
}

/**
 * Advance a combat by a deterministic duration. The returned state is a new value;
 * the input state is never mutated. At equal timestamps, the player attacks first.
 */
export function advanceCombat(state: CombatState, deltaMs: number, onAttack?: (attack: ResolvedAttack) => void,
  onSupport?: (support: ResolvedSupport) => void): CombatState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error('deltaMs must be a non-negative finite number.')
  }
  if (state.status !== 'running') return state

  let current = resolveStatus(state)
  let remainingMs = Math.min(deltaMs, Math.max(0, current.maxDurationMs - current.elapsedMs))

  while (current.status === 'running') {
    current = { ...current,
      player: triggerReadySupports(current.player, 'player', current.elapsedMs, onSupport),
      enemy: triggerReadySupports(current.enemy, 'enemy', current.elapsedMs, onSupport),
    }
    const ready = current.player.weapons.some((weapon) => weapon.remainingCooldownMs <= 1e-9)
      || current.enemy.weapons.some((weapon) => weapon.remainingCooldownMs <= 1e-9)

    if (ready) {
      const playerAttack = attackReadyWeapons(current.player, current.enemy, 'player', onAttack)
      if (playerAttack.target.health <= 0) {
        current = resolveStatus({
          ...current,
          player: playerAttack.attacker,
          enemy: playerAttack.target,
        })
        break
      }
      const enemyAttack = attackReadyWeapons(playerAttack.target, playerAttack.attacker, 'enemy', onAttack)
      current = resolveStatus({
        ...current,
        player: enemyAttack.target,
        enemy: enemyAttack.attacker,
      })
      if (current.status !== 'running') break
      continue
    }

    if (remainingMs <= 1e-9) break

    const nextAttackMs = Math.min(
      ...[current.player, current.enemy].flatMap(({ weapons, activeEffects }) => [
        ...weapons.map((weapon) => weapon.remainingCooldownMs / cooldownRate(activeEffects)),
        ...activeEffects.map(({ remainingMs }) => remainingMs),
      ]),
      remainingMs,
    )
    const stepMs = Math.min(nextAttackMs, remainingMs)
    if (!Number.isFinite(stepMs) || stepMs <= 0) break

    const reduceCooldowns = (combatant: CombatantState): CombatantState => {
      const progress = advanceEffects({ ...combatant, weaponCooldownsMs: combatant.weapons.map((weapon) => weapon.remainingCooldownMs) }, stepMs)
      return {
        ...combatant, activeEffects: progress.activeEffects,
        weapons: combatant.weapons.map((weapon, index) => ({ ...weapon, remainingCooldownMs: progress.weaponCooldownsMs[index] })),
      }
    }

    current = {
      ...current,
      player: reduceCooldowns(current.player),
      enemy: reduceCooldowns(current.enemy),
      elapsedMs: current.elapsedMs + stepMs,
    }
    remainingMs -= stepMs
    current = resolveStatus(current)
  }

  return current
}

export function getCombatResult(state: CombatState): CombatResult | null {
  if (state.status === 'running') return null
  if (state.status === 'victory') {
    return { status: 'victory', winnerId: state.player.id, loserId: state.enemy.id, elapsedMs: state.elapsedMs }
  }
  if (state.status === 'defeat') {
    return { status: 'defeat', winnerId: state.enemy.id, loserId: state.player.id, elapsedMs: state.elapsedMs }
  }
  return { status: 'timeout', winnerId: null, loserId: null, elapsedMs: state.elapsedMs }
}
