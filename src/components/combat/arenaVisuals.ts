import type { CombatEvent, CombatReport } from '../../adapters/gameEngineAdapter'
import { enemySpritePaths } from '../../assets/enemySpritePaths'
import { heroSprites } from '../../assets/heroSprites'
import type { HeroForm } from '../../data/heroForms'
import type { CharacterId } from '../../data/items'
import { allEnemies, type EnemyDefinition, type EnemyKind } from '../../data/enemies'
import type { Stage } from '../../data/levels'

export type Pose = 'idle' | 'attack' | 'hurt' | 'death' | 'special'
type Frames = { width: number; height: number; fps: number; loop?: boolean }
export type SpriteClip =
  | { kind: 'png'; src: string; pixelArt?: true }
  | (Frames & { kind: 'sheet'; src: string; count: number })
  | (Frames & { kind: 'sequence'; sources: readonly string[] })

export type SpriteVisual = {
  folder: string
  shape: string
  color: string
  mark?: string
  clips?: Partial<Record<Pose, SpriteClip>>
  idleFallback?: SpriteClip
}

export const assetPath = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`

const heroes: Record<CharacterId, SpriteVisual> = {
  goku: { folder: 'heroes/goku', shape: 'brawler', color: '#ffbb65', clips: { idle: { kind: 'png', ...heroSprites.goku.base } } },
  naruto: { folder: 'heroes/naruto', shape: 'scout', color: '#81e5ff', clips: { idle: { kind: 'png', ...heroSprites.naruto.base } } },
}

const enemyShapes: Record<EnemyKind, string> = { normal: 'trooper', minor: 'guardian', major: 'colossus' }
type EnemySprite = SpriteVisual & { png: Readonly<Record<Pose, string>> }

// Register sheets or sequences here. Individual pose PNGs are discovered automatically.
const installedEnemyClips: Partial<Record<string, SpriteVisual['clips']>> = {}
const localEnemyPngs = import.meta.glob<string>('/src/assets/enemies/*/*/*.png', {
  eager: true, query: '?url&no-inline', import: 'default',
})
const poses = ['idle', 'attack', 'hurt', 'death', 'special'] as const

export function enemySprite(enemy: EnemyDefinition, pngs: Readonly<Record<string, string>> = localEnemyPngs): EnemySprite {
  const { folder, png, pixelIdle } = enemySpritePaths(enemy)
  const sharedFolder = enemy.character === 'naruto' && enemy.kind === 'normal'
    ? 'src/assets/enemies/naruto/common' : undefined
  const clips: NonNullable<SpriteVisual['clips']> = { ...installedEnemyClips[enemy.id] }
  for (const pose of poses) {
    const src = pngs[`/${png[pose]}`]
      ?? (sharedFolder ? pngs[`/${sharedFolder}/${pose}.png`] : undefined)
    if (src && !clips[pose]) clips[pose] = { kind: 'png', src }
  }
  const pixelSrc = pngs[`/${pixelIdle}`]
    ?? (sharedFolder && !pngs[`/${png.idle}`] ? pngs[`/${sharedFolder}/idle.pixel.png`] : undefined)
  const idleFallback = pixelSrc ? clips.idle : undefined
  if (pixelSrc) clips.idle = { kind: 'png', src: pixelSrc, pixelArt: true }
  return {
    folder, shape: enemyShapes[enemy.kind], color: enemy.color, mark: enemy.mark,
    clips, png, idleFallback,
  }
}

export const enemySpriteRegistry: ReadonlyMap<string, EnemySprite> = new Map(
  allEnemies.map((enemy) => [enemy.id, enemySprite(enemy)]),
)

export function heroVisual(id: CharacterId, form?: HeroForm): SpriteVisual {
  const artwork = form && heroSprites[id].forms[form]
  const visual = heroes[id]
  return artwork ? { ...visual, clips: { idle: { kind: 'png', ...artwork } } } : visual
}

export function enemyVisual(stage: Stage): EnemySprite {
  return enemySpriteRegistry.get(stage.enemy.id) ?? enemySprite(stage.enemy)
}

export function resolveClip(visual: SpriteVisual, pose: Pose, failed?: ReadonlySet<string>) {
  return [visual.clips?.[pose], visual.clips?.idle, visual.idleFallback]
    .find((clip) => clip && (clip.kind === 'sequence' || !failed?.has(clip.src)))
}

export function frameCount(clip: SpriteClip) {
  return clip.kind === 'sheet' ? clip.count : clip.kind === 'sequence' ? clip.sources.length : 1
}

export function frameSource(clip: SpriteClip | undefined, frame: number, failed: ReadonlySet<string>) {
  if (!clip) return undefined
  const src = clip.kind === 'sequence' ? clip.sources[frame] : clip.src
  return src && !failed.has(src) ? src : undefined
}

const techniques: Record<string, { theme: string; special?: boolean }> = {
  'power-pole': { theme: 'staff' },
  'energized-power-pole': { theme: 'staff' },
  'kaioken-power-pole': { theme: 'staff', special: true },
  'ki-orbs': { theme: 'ki' },
  'double-ki-burst': { theme: 'ki' },
  kamehameha: { theme: 'beam', special: true },
  'empowered-kamehameha': { theme: 'beam', special: true },
  'spirit-bomb': { theme: 'spirit', special: true },
  'focused-spirit-bomb': { theme: 'spirit', special: true },
  'ultra-instinct': { theme: 'instinct', special: true },
  kunai: { theme: 'blade' },
  'twin-kunai': { theme: 'blade' },
  'shadow-kunai': { theme: 'blade' },
  'shadow-clones': { theme: 'clones' },
  'kyubi-clones': { theme: 'clones', special: true },
  'nine-tails-chakra': { theme: 'baryon', special: true },
  rasengan: { theme: 'vortex', special: true },
  'kyubi-rasengan': { theme: 'vortex', special: true },
  rasenshuriken: { theme: 'wind', special: true },
  'kurama-rasenshuriken': { theme: 'wind', special: true },
  'baryon-mode': { theme: 'baryon', special: true },
}

export function eventStyle(event: CombatEvent) {
  return event.visual ?? techniques[event.techniqueId ?? ''] ?? { theme: 'strike' }
}

type Impact = { id: string; target: CombatEvent['target']; kind: 'damage' | 'heal' | 'shield'; amount: number }

export function arenaImpacts(events: readonly CombatEvent[]): Iterable<Impact> {
  const impacts = new Map<string, Impact>()
  for (const { id, tick, kind, target, amount } of events) {
    if (amount === undefined || (kind !== 'damage' && kind !== 'heal' && kind !== 'shield')) continue
    const key = tick === undefined ? `event-${id}` : `tick-${tick}-${target}-${kind}`
    const impact = impacts.get(key)
    if (impact) impact.amount += amount
    else impacts.set(key, { id: key, target, kind, amount })
  }
  return impacts.values()
}

type Side = CombatEvent['target']
export type Playback = { pose: Pose; id: string }

export function arenaPlayback(events: readonly CombatEvent[], side: Side): Playback {
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]
    if (event.kind === 'death' && event.target === side) return { id: event.id, pose: 'death' }
  }
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]
    if (event.kind === 'transform' && event.target === side) return { id: event.id, pose: 'special' }
    if (event.kind === 'attack' && event.source === side) return { id: event.id, pose: eventStyle(event).special ? 'special' : 'attack' }
    if ((event.kind === 'damage' || event.kind === 'shield') && event.target === side) return { id: event.id, pose: 'hurt' }
  }
  return { id: 'idle', pose: 'idle' }
}

export const outcomeLabels: Record<CombatReport['outcome'], string> = {
  victory: 'Victoria', defeat: 'Derrota', timeout: 'Tiempo agotado',
}
