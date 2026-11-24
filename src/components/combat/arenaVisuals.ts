import type { CombatEvent, CombatReport } from '../../adapters/gameEngineAdapter'
import { heroSprites } from '../../assets/heroSprites'
import { heroForms, type HeroForm } from '../../data/heroForms'
import type { CharacterId } from '../../data/items'
import { allEnemies, type EnemyDefinition, type EnemyKind } from '../../data/enemies'
import type { Stage } from '../../data/levels'

export type Pose = 'idle' | 'attack' | 'hurt' | 'death' | 'special'
type Frames = { width: number; height: number; fps: number; loop?: boolean }
export type SpriteClip =
  | { kind: 'png'; src: string }
  | (Frames & { kind: 'sheet'; src: string; count: number })
  | (Frames & { kind: 'sequence'; sources: readonly string[] })

export type SpriteVisual = {
  folder: string
  shape: string
  color: string
  mark?: string
  clips?: Partial<Record<Pose, SpriteClip>>
}

export const assetPath = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`

const heroes: Record<CharacterId, SpriteVisual> = {
  goku: { folder: 'heroes/goku', shape: 'brawler', color: '#ffbb65', clips: { idle: { kind: 'png', src: heroSprites.goku.base } } },
  naruto: { folder: 'heroes/naruto', shape: 'scout', color: '#81e5ff', clips: { idle: { kind: 'png', src: heroSprites.naruto.base } } },
}

function transformedHero(id: CharacterId): SpriteVisual {
  const src = heroSprites[id].forms[heroForms[id]]
  return src ? { ...heroes[id], clips: { idle: { kind: 'png', src } } } : heroes[id]
}

const transformedHeroes = { goku: transformedHero('goku'), naruto: transformedHero('naruto') }

const enemyShapes: Record<EnemyKind, string> = { normal: 'trooper', minor: 'guardian', major: 'colossus' }
type EnemySprite = SpriteVisual & { png: Readonly<Record<Pose, string>> }

// Add clips here when their local PNGs are available. Planned paths do not issue requests.
const installedEnemyClips: Partial<Record<string, SpriteVisual['clips']>> = {}
const localEnemyPngs = import.meta.glob<string>('../../assets/enemies/*/*/*.png', {
  eager: true, query: '?url', import: 'default',
})
const poses = ['idle', 'attack', 'hurt', 'death', 'special'] as const

function enemySprite(enemy: EnemyDefinition): EnemySprite {
  const slug = enemy.id.slice(enemy.character.length + 1)
  const folder = `enemies/${enemy.character}/${slug}`
  const sharedFolder = enemy.character === 'naruto' && enemy.kind === 'normal'
    ? 'enemies/naruto/common' : undefined
  const clips: NonNullable<SpriteVisual['clips']> = { ...installedEnemyClips[enemy.id] }
  for (const pose of poses) {
    const src = localEnemyPngs[`../../assets/${folder}/${pose}.png`]
      ?? (sharedFolder ? localEnemyPngs[`../../assets/${sharedFolder}/${pose}.png`] : undefined)
    if (src && !clips[pose]) clips[pose] = { kind: 'png', src }
  }
  return {
    folder, shape: enemyShapes[enemy.kind], color: enemy.color, mark: enemy.mark,
    clips,
    png: {
      idle: assetPath(`${folder}/idle.png`), attack: assetPath(`${folder}/attack.png`),
      hurt: assetPath(`${folder}/hurt.png`), death: assetPath(`${folder}/death.png`),
      special: assetPath(`${folder}/special.png`),
    },
  }
}

export const enemySpriteRegistry: ReadonlyMap<string, EnemySprite> = new Map(
  allEnemies.map((enemy) => [enemy.id, enemySprite(enemy)]),
)

export function heroVisual(id: CharacterId, form?: HeroForm): SpriteVisual {
  return form === heroForms[id] ? transformedHeroes[id] : heroes[id]
}

export function enemyVisual(stage: Stage): EnemySprite {
  return enemySpriteRegistry.get(stage.enemy.id) ?? enemySprite(stage.enemy)
}

export function resolveClip(visual: SpriteVisual, pose: Pose) {
  return visual.clips?.[pose] ?? visual.clips?.idle
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
    if (event.kind === 'damage' && event.target === side) return { id: event.id, pose: 'hurt' }
  }
  return { id: 'idle', pose: 'idle' }
}

export const outcomeLabels: Record<CombatReport['outcome'], string> = {
  victory: 'Victoria', defeat: 'Derrota', timeout: 'Tiempo agotado',
}
