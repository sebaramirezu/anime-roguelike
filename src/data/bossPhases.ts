import type { CombatSupport, GameEffect } from '../engine'
import type { EnemyDefinition } from './enemies'

type Phase = {
  name: string
  threshold: number
  seconds: number
  theme: string
  boost?: number
  specialBoost?: number
  recharge?: number
  guard?: number
  heal?: number
  shield?: number
}

const phases: Partial<Record<string, Phase>> = {
  'goku-piccolo': { name: 'Ki concentrado', threshold: 0.48, seconds: 13, theme: 'beam', boost: 28 },
  'goku-vegeta': { name: 'Orgullo saiyajin', threshold: 0.46, seconds: 14, theme: 'beam', specialBoost: 58, recharge: 12 },
  'goku-freezer': { name: 'Asalto a máxima potencia', threshold: 0.53, seconds: 15, theme: 'ki', recharge: 24, boost: 14 },
  'goku-cell': { name: 'Perfección defensiva', threshold: 0.50, seconds: 13, theme: 'beam', guard: 22, boost: 26 },
  'goku-majin-buu': { name: 'Regeneración de Majin Buu', threshold: 0.40, seconds: 16, theme: 'baryon', heal: 8, boost: 32 },
  'naruto-zabuza': { name: 'Ofensiva de la Niebla', threshold: 0.50, seconds: 14, theme: 'vortex', boost: 32 },
  'naruto-orochimaru': { name: 'Piel de serpiente', threshold: 0.58, seconds: 15, theme: 'blade', guard: 24, boost: 18 },
  'naruto-gaara': { name: 'Defensa de arena', threshold: 0.52, seconds: 13, theme: 'vortex', shield: 180, guard: 26, recharge: 10 },
  'naruto-itachi': { name: 'Ventana de Amaterasu', threshold: 0.48, seconds: 16, theme: 'spirit', specialBoost: 62, recharge: 14 },
  'naruto-pain': { name: 'Repulsión final', threshold: 0.38, seconds: 14, theme: 'vortex', boost: 38, recharge: 14 },
}

export function bossPhaseFor(enemy: EnemyDefinition) {
  return enemy.kind === 'major' ? phases[enemy.id] : undefined
}

export function bossPhaseSupport(enemy: EnemyDefinition): CombatSupport | undefined {
  const phase = bossPhaseFor(enemy)
  if (!phase) return
  const durationMs = phase.seconds * 1000
  const effects: GameEffect[] = []
  if (phase.boost) effects.push({ kind: 'damageBoost', percent: phase.boost, durationMs })
  if (phase.specialBoost) effects.push({ kind: 'damageBoost', percent: phase.specialBoost, durationMs,
    weaponId: enemy.abilities.find(({ special }) => special)?.id })
  if (phase.recharge) effects.push({ kind: 'cooldownReduction', percent: phase.recharge, mode: 'duration', durationMs })
  if (phase.guard) effects.push({ kind: 'damageReduction', percent: phase.guard, durationMs })
  if (phase.heal) effects.push({ kind: 'heal', maxHealthPercent: phase.heal })
  const techniqueId = `${enemy.id}-phase`
  return { id: techniqueId, techniqueId, name: phase.name, threshold: phase.threshold, strictThreshold: true, effects }
}
