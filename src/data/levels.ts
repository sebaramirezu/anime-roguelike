import { getLevel } from '../engine'
import { enemyRoster, type EnemyDefinition, type EnemyKind } from './enemies'
import type { CharacterId } from './items'

export const enemyLabels: Record<EnemyKind, string> = {
  normal: 'Enemigo normal', minor: 'Jefe menor', major: 'Jefe mayor',
}

const regions: Record<CharacterId, readonly string[]> = {
  goku: ['Llegada de los saiyajin', 'Campo de batalla saiyajin', 'Namek bajo asedio', 'Juegos de Cell', 'Despertar de Majin Buu'],
  naruto: ['País de las Olas', 'Bosque de la Muerte', 'Invasión de Konoha', 'Sombras de Akatsuki', 'Asedio de Pain'],
}

export type Stage = {
  id: string
  character: CharacterId
  level: number
  number: number
  total: number
  region: string
  enemy: EnemyDefinition
}

function createCampaign(character: CharacterId) {
  const roster = enemyRoster[character]
  let normalIndex = 0
  let minorIndex = 0
  return regions[character].map((name, index) => {
    const level = getLevel(index + 1)
    const stages = level.stages.map(({ stageNumber, enemyType }): Stage => {
      const enemy = enemyType === 'majorBoss' ? roster.major[index]
        : enemyType === 'minorBoss' ? roster.minor[minorIndex++]
        : roster.normal[normalIndex++ % roster.normal.length]
      return {
        id: `level-${level.levelNumber}-stage-${stageNumber}`,
        character, level: level.levelNumber, number: stageNumber, total: level.stages.length, region: name, enemy,
      }
    })
    return { level: level.levelNumber, name, special: level.type === 'special', stages }
  })
}

const campaigns = { goku: createCampaign('goku'), naruto: createCampaign('naruto') }
const stageLists = { goku: campaigns.goku.flatMap((level) => level.stages), naruto: campaigns.naruto.flatMap((level) => level.stages) }

export function levelsFor(character: CharacterId) { return campaigns[character] }
export function stagesFor(character: CharacterId) { return stageLists[character] }
