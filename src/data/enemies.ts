import type { CharacterId } from './items'

export type EnemyKind = 'normal' | 'minor' | 'major'
type AbilityTheme = 'strike' | 'blade' | 'beam' | 'vortex' | 'wind' | 'ki' | 'clones' | 'spirit' | 'baryon'
export type EnemyAbility = {
  id: string
  name: string
  damage: number
  cooldownMs: number
  theme: AbilityTheme
  special?: boolean
}

type Attack = readonly [name: string, damage: number, cooldownMs: number, theme: AbilityTheme]
type RosterEntry = readonly [slug: string, name: string, mark: string, color: string, health: number, primary: Attack, secondary?: Attack]

export type EnemyDefinition = {
  id: string
  character: CharacterId
  kind: EnemyKind
  name: string
  mark: string
  color: string
  health: number
  abilities: readonly EnemyAbility[]
}

function roster(character: CharacterId, kind: EnemyKind, entries: readonly RosterEntry[]): EnemyDefinition[] {
  return entries.map(([slug, name, mark, color, health, primary, secondary]) => {
    const id = `${character}-${slug}`
    const attacks = secondary ? [primary, secondary] : [primary]
    return {
      id, character, kind, name, mark, color, health,
      abilities: attacks.map(([name, damage, cooldownMs, theme], index) => ({
        id: `${id}-attack-${index + 1}`, name, damage, cooldownMs, theme, special: index > 0,
      })),
    }
  })
}

export const enemyRoster = {
  goku: {
    normal: roster('goku', 'normal', [
      ['raditz', 'Raditz', 'RA', '#b5a2db', 22, ['Ráfaga saiyajin', 4, 1850, 'ki']],
    ]),
    minor: roster('goku', 'minor', [
      ['cui', 'Cui', 'CU', '#ac82e0', 31, ['Ráfaga de emboscada', 5, 1950, 'ki']],
      ['dodoria', 'Dodoria', 'DO', '#fa9cae', 39, ['Carga demoledora', 7, 2550, 'strike']],
      ['zarbon', 'Zarbon', 'ZA', '#8be0ca', 37, ['Golpe acrobático', 6, 1890, 'strike']],
      ['guldo', 'Guldo', 'GU', '#a3d786', 32, ['Lanzamiento psíquico', 6, 1700, 'vortex']],
      ['recoome', 'Recoome', 'RE', '#f9aa80', 47, ['Patada Recoome', 7, 2400, 'strike'], ['Cañón de energía', 5, 5400, 'beam']],
      ['burter', 'Burter', 'BU', '#8cbbf2', 37, ['Carrera azul', 4, 1050, 'strike']],
      ['jeice', 'Jeice', 'JE', '#f58c94', 42, ['Bola Aplastante', 7, 2100, 'ki']],
      ['ginyu', 'Capitán Ginyu', 'GI', '#bb9af2', 49, ['Golpe del capitán', 6, 1850, 'strike'], ['Onda púrpura', 6, 4900, 'beam']],
      ['android-19', 'Androide 19', '19', '#dbb188', 46, ['Agarre de combate', 8, 2700, 'strike']],
      ['dr-gero', 'Dr. Gero', '20', '#c2c8dc', 44, ['Rayo del androide', 7, 2200, 'beam']],
      ['pui-pui', 'Pui Pui', 'PP', '#b5b9dc', 43, ['Choque de élite', 7, 2100, 'strike']],
      ['yakon', 'Yakon', 'YA', '#a1d191', 50, ['Zarpazo', 8, 2500, 'blade']],
      ['babidi', 'Babidi', 'BA', '#e5c075', 36, ['Orbe mágico', 6, 1730, 'vortex']],
      ['dabura', 'Dabura', 'DA', '#ee988c', 55, ['Corte infernal', 8, 2300, 'blade'], ['Llamarada demoníaca', 7, 5600, 'beam']],
    ]),
    major: roster('goku', 'major', [
      ['piccolo', 'Piccolo', 'PI', '#9bd77f', 49, ['Onda de Ki', 6, 1950, 'ki'], ['Makankōsappō', 6, 4300, 'beam']],
      ['vegeta', 'Vegeta', 'VE', '#8eafff', 57, ['Ráfaga real', 7, 1800, 'ki'], ['Cañón Galick', 11, 5100, 'beam']],
      ['freezer', 'Freezer', 'FR', '#f8abd9', 64, ['Rayo de la muerte', 8, 1830, 'beam'], ['Bola de la muerte', 12, 5800, 'ki']],
      ['cell', 'Cell', 'CE', '#a9dc91', 74, ['Golpe perfecto', 9, 1810, 'strike'], ['Kamehameha de Cell', 13, 5800, 'beam']],
      ['majin-buu', 'Majin Buu', 'MB', '#efa7cb', 84, ['Embate Majin', 10, 1700, 'strike'], ['Explosión rosada', 14, 5700, 'baryon']],
    ]),
  },
  naruto: {
    normal: roster('naruto', 'normal', [
      ['mist-ninja', 'Ninja de la Niebla', 'NI', '#80cedf', 21, ['Kunai de la Niebla', 3, 1450, 'blade']],
      ['leaf-ninja', 'Ninja de la Hoja', 'HO', '#95d69e', 20, ['Lanzamiento de shuriken', 4, 1850, 'blade']],
      ['sound-ninja', 'Ninja del Sonido', 'SO', '#c5a4ea', 24, ['Onda sonora', 4, 1700, 'vortex']],
      ['sand-ninja', 'Ninja de la Arena', 'AR', '#f0be85', 26, ['Vendaval de arena', 5, 2200, 'wind']],
      ['cloud-ninja', 'Ninja de la Nube', 'NU', '#bdc5f5', 22, ['Embestida eléctrica', 4, 1650, 'beam']],
      ['rain-ninja', 'Ninja de la Lluvia', 'LL', '#8fafd4', 25, ['Lluvia de senbon', 5, 2100, 'blade']],
    ]),
    minor: roster('naruto', 'minor', [
      ['haku', 'Haku', 'HA', '#a1e6ef', 33, ['Senbon de hielo', 5, 1460, 'blade'], ['Espejos de hielo', 5, 4700, 'clones']],
      ['mizuki', 'Mizuki', 'MI', '#b2aedf', 38, ['Shuriken gigante', 7, 2370, 'blade']],
      ['dosu', 'Dosu', 'DO', '#afa3d9', 36, ['Eco resonante', 6, 1870, 'vortex']],
      ['zaku', 'Zaku', 'ZA', '#94dacc', 37, ['Corte de aire', 7, 2120, 'wind']],
      ['kin', 'Kin', 'KI', '#bf9ac7', 35, ['Agujas con cascabel', 5, 1400, 'blade']],
      ['kankuro', 'Kankurō', 'KA', '#bd98f2', 43, ['Ataque de marioneta', 7, 2050, 'clones']],
      ['temari', 'Temari', 'TE', '#dcce94', 44, ['Vendaval del abanico', 7, 1800, 'wind']],
      ['kabuto', 'Kabuto', 'KB', '#b8c7ed', 45, ['Bisturí de chakra', 8, 2400, 'blade']],
      ['kimimaro', 'Kimimaro', 'KM', '#e6d5ea', 49, ['Danza ósea', 8, 1850, 'blade'], ['Lanza de hueso', 7, 5200, 'blade']],
      ['tayuya', 'Tayuya', 'TA', '#ee9ba2', 45, ['Melodía de ataque', 7, 1900, 'vortex']],
      ['jirobo', 'Jirōbō', 'JI', '#cfad82', 52, ['Embestida de tierra', 9, 2610, 'strike']],
      ['kidomaru', 'Kidōmaru', 'KD', '#b9c790', 46, ['Flecha de telaraña', 8, 2210, 'blade']],
      ['sakon-ukon', 'Sakon y Ukon', 'SU', '#baa5dd', 48, ['Golpe gemelo', 7, 1610, 'clones']],
      ['konan', 'Konan', 'KO', '#c5b0f4', 52, ['Cuchillas de papel', 8, 1960, 'blade'], ['Tormenta de papel', 6, 5150, 'wind']],
    ]),
    major: roster('naruto', 'major', [
      ['zabuza', 'Zabuza', 'ZB', '#87cfe0', 49, ['Corte de Kubikiribōchō', 7, 2010, 'blade'], ['Dragón de agua', 7, 4700, 'vortex']],
      ['orochimaru', 'Orochimaru', 'OR', '#cbb0f3', 57, ['Golpe serpentino', 7, 1830, 'strike'], ['Espada Kusanagi', 10, 4850, 'blade']],
      ['gaara', 'Gaara', 'GA', '#e8bb87', 65, ['Ráfaga de arena', 8, 1850, 'wind'], ['Ataúd de arena', 12, 5700, 'vortex']],
      ['itachi', 'Itachi', 'IT', '#ed9aa8', 73, ['Bola de fuego', 9, 1860, 'baryon'], ['Amaterasu', 13, 5800, 'spirit']],
      ['pain', 'Pain', 'PA', '#f3a985', 83, ['Receptor de chakra', 10, 1720, 'blade'], ['Shinra Tensei', 14, 5650, 'vortex']],
    ]),
  },
} satisfies Record<CharacterId, Record<EnemyKind, EnemyDefinition[]>>

export const allEnemies = Object.values(enemyRoster).flatMap(({ normal, minor, major }) => [...normal, ...minor, ...major])
