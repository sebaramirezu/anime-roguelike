import type { EnemyDefinition } from '../data/enemies'

export function enemySpritePaths({ id, character }: Pick<EnemyDefinition, 'id' | 'character'>) {
  const slug = id.slice(character.length + 1)
  const folder = `enemies/${character}/${slug}`
  const source = `src/assets/${folder}`
  return {
    folder,
    pixelIdle: `${source}/idle.pixel.png`,
    png: {
      idle: `${source}/idle.png`,
      attack: `${source}/attack.png`,
      hurt: `${source}/hurt.png`,
      death: `${source}/death.png`,
      special: `${source}/special.png`,
    },
  }
}
