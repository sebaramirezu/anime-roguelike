export type EnemyKind = 'normal' | 'minor' | 'major'

export const enemyLabels: Record<EnemyKind, string> = {
  normal: 'Enemigo normal', minor: 'Jefe menor', major: 'Jefe mayor',
}

const regions = [
  { name: 'Bosque de Ceniza', color: '#97dbad', boss: 'El Ciervo de Ceniza', mark: '♜', weakness: 'Sus raíces expuestas son su punto débil.', enemies: ['Lobo de ceniza', 'Centinela de corteza', 'Cuervo de brasas'], guardians: ['Guardián del Sotobosque', 'Raíz Errante'] },
  { name: 'Ciudadela Umbría', color: '#98bcff', boss: 'La Reina del Eclipse', mark: '☾', weakness: 'Su corona es vulnerable cuando se apaga el halo.', enemies: ['Vigía umbrío', 'Lancero hueco', 'Espíritu de almena'], guardians: ['Alcaide del Foso', 'Caballera del Ocaso'] },
  { name: 'Forja del Vacío', color: '#ffae79', boss: 'El Coloso de Obsidiana', mark: '⬢', weakness: 'El núcleo queda expuesto entre descargas.', enemies: [], guardians: ['Herrero espectral', 'Heraldo de hierro', 'Yunque viviente', 'Titán de lava'] },
  { name: 'Santuario del Vendaval', color: '#99e9df', boss: 'La Serpiente del Trueno', mark: 'ϟ', weakness: 'Sus escamas se abren al descargar electricidad.', enemies: ['Eco del viento', 'Espectro de lluvia', 'Monje de bruma'], guardians: ['Abad de la Tormenta', 'Águila del Relámpago'] },
  { name: 'Trono del Fin', color: '#ed9ee7', boss: 'El Soberano del Abismo', mark: '✸', weakness: 'Su armadura se abre al canalizar energía.', enemies: [], guardians: ['Juez de los Ecos', 'Heralda del Silencio', 'Carcelero Sombrío', 'Oráculo del Fin'] },
] as const

export type Stage = {
  id: string
  level: number
  number: number
  total: number
  region: string
  enemy: { name: string; kind: EnemyKind; mark: string; color: string; weakness?: string }
}

export const levels = regions.map((region, index) => {
  const level = index + 1
  const special = level === 3 || level === 5
  const total = special ? 5 : 12
  const stages = Array.from({ length: total }, (_, offset): Stage => {
    const number = offset + 1
    const kind = number === total ? 'major' : special || number % 4 === 0 ? 'minor' : 'normal'
    const guardianIndex = special ? offset : number / 4 - 1
    const name = kind === 'major' ? region.boss
      : kind === 'minor' ? region.guardians[guardianIndex]
      : region.enemies[offset % 3]
    return {
      id: `level-${level}-stage-${number}`, level, number, total, region: region.name,
      enemy: {
        name, kind, mark: kind === 'major' ? region.mark : kind === 'minor' ? '◈' : '◆', color: region.color,
        weakness: kind === 'major' ? region.weakness : undefined,
      },
    }
  })
  return { level, name: region.name, special, stages, plannedWeakness: region.weakness }
})

export const stages = levels.flatMap((level) => level.stages)
