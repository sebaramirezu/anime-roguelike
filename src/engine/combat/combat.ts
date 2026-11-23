import type {
  CombatantDefinition,
  CombatantState,
  CombatResult,
  CombatState,
  CreateCombatOptions,
  WeaponState,
} from './types'

const DEFAULT_MAX_DURATION_MS = 120_000

function validateCombatant(combatant: CombatantDefinition, label: string): void {
  if (!combatant.id) throw new Error(`${label} must have an id.`)
  if (!Number.isFinite(combatant.maxHealth) || combatant.maxHealth <= 0) {
    throw new Error(`${label} maxHealth must be a positive finite number.`)
  }

  const weaponIds = new Set<string>()
  for (const weapon of combatant.weapons) {
    if (!weapon.id) throw new Error(`${label} weapons must have an id.`)
    if (weaponIds.has(weapon.id)) throw new Error(`${label} weapon ids must be unique.`)
    weaponIds.add(weapon.id)
    if (!Number.isFinite(weapon.damage) || weapon.damage < 0) {
      throw new Error(`${label} weapon damage must be a non-negative finite number.`)
    }
    if (!Number.isFinite(weapon.cooldownMs) || weapon.cooldownMs <= 0) {
      throw new Error(`${label} weapon cooldownMs must be a positive finite number.`)
    }
  }
}

function createCombatant(definition: CombatantDefinition): CombatantState {
  return {
    id: definition.id,
    maxHealth: definition.maxHealth,
    health: definition.maxHealth,
    weapons: definition.weapons.map((weapon): WeaponState => ({
      ...weapon,
      remainingCooldownMs: 0,
    })),
  }
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
): { attacker: CombatantState; target: CombatantState } {
  let updatedTarget = target
  const updatedWeapons = attacker.weapons.map((weapon) => {
    if (weapon.remainingCooldownMs > 1e-9) return weapon

    updatedTarget = {
      ...updatedTarget,
      health: Math.max(0, updatedTarget.health - weapon.damage),
    }
    return { ...weapon, remainingCooldownMs: weapon.cooldownMs }
  })

  return {
    attacker: { ...attacker, weapons: updatedWeapons },
    target: updatedTarget,
  }
}

/**
 * Advance a combat by a deterministic duration. The returned state is a new value;
 * the input state is never mutated. At equal timestamps, the player attacks first.
 */
export function advanceCombat(state: CombatState, deltaMs: number): CombatState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error('deltaMs must be a non-negative finite number.')
  }
  if (state.status !== 'running') return state

  let current = resolveStatus(state)
  let remainingMs = Math.min(deltaMs, Math.max(0, current.maxDurationMs - current.elapsedMs))

  while (current.status === 'running') {
    const ready = current.player.weapons.some((weapon) => weapon.remainingCooldownMs <= 1e-9)
      || current.enemy.weapons.some((weapon) => weapon.remainingCooldownMs <= 1e-9)

    if (ready) {
      const playerAttack = attackReadyWeapons(current.player, current.enemy)
      if (playerAttack.target.health <= 0) {
        current = resolveStatus({
          ...current,
          player: playerAttack.attacker,
          enemy: playerAttack.target,
        })
        break
      }
      const enemyAttack = attackReadyWeapons(playerAttack.target, playerAttack.attacker)
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
      ...current.player.weapons.map((weapon) => weapon.remainingCooldownMs),
      ...current.enemy.weapons.map((weapon) => weapon.remainingCooldownMs),
      remainingMs,
    )
    const stepMs = Math.min(nextAttackMs, remainingMs)
    if (!Number.isFinite(stepMs) || stepMs <= 0) break

    const reduceCooldowns = (combatant: CombatantState): CombatantState => ({
      ...combatant,
      weapons: combatant.weapons.map((weapon) => ({
        ...weapon,
        remainingCooldownMs: Math.max(0, weapon.remainingCooldownMs - stepMs),
      })),
    })

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
