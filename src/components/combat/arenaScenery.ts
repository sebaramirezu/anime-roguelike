import type { CharacterId } from '../../data/items'
import type { Stage } from '../../data/levels'

const scenes = {
  'saiyan-rocks': { rim: '#d3957b', ambient: 'dust' },
  namek: { rim: '#90d8b0', ambient: 'ripples' },
  'android-outskirts': { rim: '#cc9a91', ambient: 'dust' },
  'cell-ring': { rim: '#a9c8d2', ambient: 'wind' },
  'majin-wastes': { rim: '#ed9cac', ambient: 'embers' },
  'ninja-forest': { rim: '#87be9c', ambient: 'leaves' },
  'zabuza-bridge': { rim: '#a7d4e0', ambient: 'mist' },
  'forest-of-death': { rim: '#9eac86', ambient: 'leaves' },
  'hidden-leaf': { rim: '#e1b58d', ambient: 'wind' },
  'pain-ruins': { rim: '#c3a2bc', ambient: 'dust' },
} as const

type SceneId = keyof typeof scenes
const worlds: Record<CharacterId, readonly SceneId[]> = {
  goku: ['saiyan-rocks', 'saiyan-rocks', 'namek', 'android-outskirts', 'majin-wastes'],
  naruto: ['ninja-forest', 'forest-of-death', 'hidden-leaf', 'hidden-leaf', 'pain-ruins'],
}
const backgrounds = import.meta.glob<string>('../../assets/backgrounds/*.png', { eager: true, query: '?url&no-inline', import: 'default' })

export function sceneryFor(stage: Stage) {
  let id = worlds[stage.character][stage.level - 1]
  if (stage.character === 'goku' && stage.level === 4 && stage.enemy.id === 'goku-cell') id = 'cell-ring'
  if (stage.character === 'naruto' && stage.level === 1 && ['naruto-haku', 'naruto-zabuza'].includes(stage.enemy.id)) id = 'zabuza-bridge'
  const path = `../../assets/backgrounds/${id}.png`
  return { id, ...scenes[id], url: backgrounds[path] }
}
