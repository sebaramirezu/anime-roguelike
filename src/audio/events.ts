import type { CombatEvent, CombatReport, CombatUpdate } from '../adapters/gameEngineAdapter'
import type { EnemyKind } from '../data/enemies'
import type { SoundCue } from './synth'
import type { MusicScene } from './musicCatalog'

const techniques: Readonly<Partial<Record<string, SoundCue>>> = {
  'power-pole': 'staff', 'ki-orbs': 'ki', kaioken: 'kaioken', kamehameha: 'beam',
  'spirit-bomb': 'genkidama', 'focused-spirit-bomb': 'genkidama', 'ultra-instinct': 'instinct',
  kunai: 'kunai', 'shadow-clones': 'clones', 'nine-tails-chakra': 'kyubi',
  rasengan: 'rasengan', rasenshuriken: 'rasenshuriken', 'kurama-rasenshuriken': 'rasenshuriken',
  'baryon-mode': 'baryon',
}

const energyThemes = new Set(['ki', 'beam', 'spirit', 'vortex', 'clones', 'baryon'])

export function soundForEvent(event: CombatEvent): SoundCue | undefined {
  const technique = techniques[event.techniqueId ?? '']
  switch (event.kind) {
    case 'attack':
      if (technique) return technique
      if (event.visual?.special) return 'special'
      if (event.visual?.theme === 'blade' || event.visual?.theme === 'wind') return 'weapon'
      return energyThemes.has(event.visual?.theme ?? '') ? 'energy' : 'physical'
    case 'damage':
      return event.target === 'player'
        ? event.critical ? 'criticalTaken' : 'hurt'
        : event.critical ? 'criticalHit' : 'hit'
    case 'shield': return event.target === 'player' ? 'protect' : 'shieldHit'
    case 'heal': return 'heal'
    case 'transform': return technique ?? 'transform'
    case 'death': return event.target === 'player' ? 'playerDown' : 'enemyDown'
    case 'effect': return technique
  }
}

export function sceneForCombat(kind: EnemyKind, outcome?: CombatReport['outcome']): MusicScene | null {
  return outcome === 'timeout' ? null : outcome ?? kind
}

export class CombatSoundCursor {
  private seen = new Set<string>()
  private lowHealth = false
  private finished = false

  read(update: CombatUpdate, allowOutcomeChime = true): SoundCue[] {
    if (this.finished) return []
    const cues: SoundCue[] = []
    for (const event of update.recentEvents ?? []) {
      if (this.seen.has(event.id)) continue
      this.seen.add(event.id)
      const cue = soundForEvent(event)
      if (cue) cues.push(cue)
    }

    if (update.status === 'finished') {
      this.finished = true
      if (allowOutcomeChime && update.report.outcome !== 'timeout') cues.push(update.report.outcome)
    } else {
      const { health, maxHealth } = update.player ?? {}
      if (health !== undefined && maxHealth && health > 0) {
        const ratio = health / maxHealth
        if (!this.lowHealth && ratio <= 0.20) {
          this.lowHealth = true
          cues.push('danger')
        } else if (ratio >= 0.30) this.lowHealth = false
      }
    }
    return cues
  }
}
