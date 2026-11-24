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
      ['raditz', 'Raditz', 'RA', '#b5a2db', 22, ['Ráfaga saiyajin', 54, 1850, 'ki']],
    ]),
    minor: roster('goku', 'minor', [
      ['cui', 'Cui', 'CU', '#ac82e0', 31, ['Ráfaga de emboscada', 77, 2200, 'ki']],
      ['dodoria', 'Dodoria', 'DO', '#fa9cae', 39, ['Carga demoledora', 101, 2780, 'strike']],
      ['zarbon', 'Zarbon', 'ZA', '#8be0ca', 37, ['Golpe acrobático', 84, 2200, 'strike']],
      ['guldo', 'Guldo', 'GU', '#a3d786', 32, ['Lanzamiento psíquico', 78, 2020, 'vortex']],
      ['recoome', 'Recoome', 'RE', '#f9aa80', 47, ['Patada Recoome', 92, 2650, 'strike'], ['Cañón de energía', 92, 7600, 'beam']],
      ['burter', 'Burter', 'BU', '#8cbbf2', 37, ['Carrera azul', 58, 1440, 'strike']],
      ['jeice', 'Jeice', 'JE', '#f58c94', 42, ['Bola Aplastante', 94, 2480, 'ki']],
      ['ginyu', 'Capitán Ginyu', 'GI', '#bb9af2', 49, ['Golpe del capitán', 80, 2230, 'strike'], ['Onda púrpura', 96, 7900, 'beam']],
      ['android-19', 'Androide 19', '19', '#dbb188', 46, ['Agarre de combate', 113, 2880, 'strike']],
      ['dr-gero', 'Dr. Gero', '20', '#c2c8dc', 44, ['Rayo del androide', 97, 2550, 'beam']],
      ['pui-pui', 'Pui Pui', 'PP', '#b5b9dc', 43, ['Choque de élite', 100, 2550, 'strike']],
      ['yakon', 'Yakon', 'YA', '#a1d191', 50, ['Zarpazo', 119, 3020, 'blade']],
      ['babidi', 'Babidi', 'BA', '#e5c075', 36, ['Orbe mágico', 88, 2220, 'vortex']],
      ['dabura', 'Dabura', 'DA', '#ee988c', 55, ['Corte infernal', 107, 2790, 'blade'], ['Llamarada demoníaca', 104, 8900, 'beam']],
    ]),
    major: roster('goku', 'major', [
      ['piccolo', 'Piccolo', 'PI', '#9bd77f', 49, ['Onda de Ki', 103, 3700, 'ki'], ['Makankōsappō', 138, 10400, 'beam']],
      ['vegeta', 'Vegeta', 'VE', '#8eafff', 57, ['Ráfaga real', 110, 3200, 'ki'], ['Cañón Galick', 150, 9000, 'beam']],
      ['freezer', 'Freezer', 'FR', '#f8abd9', 64, ['Rayo de la muerte', 102, 2900, 'beam'], ['Bola de la muerte', 156, 9600, 'ki']],
      ['cell', 'Cell', 'CE', '#a9dc91', 74, ['Golpe perfecto', 115, 3100, 'strike'], ['Kamehameha de Cell', 162, 9600, 'beam']],
      ['majin-buu', 'Majin Buu', 'MB', '#efa7cb', 84, ['Embate Majin', 120, 3650, 'strike'], ['Explosión rosada', 171, 11600, 'baryon']],
    ]),
  },
  naruto: {
    normal: roster('naruto', 'normal', [
      ['mist-ninja', 'Ninja de la Niebla', 'NI', '#80cedf', 21, ['Kunai de la Niebla', 46, 1450, 'blade']],
      ['leaf-ninja', 'Ninja de la Hoja', 'HO', '#95d69e', 20, ['Lanzamiento de shuriken', 54, 1850, 'blade']],
      ['sound-ninja', 'Ninja del Sonido', 'SO', '#c5a4ea', 24, ['Onda sonora', 52, 1700, 'vortex']],
      ['sand-ninja', 'Ninja de la Arena', 'AR', '#f0be85', 26, ['Vendaval de arena', 63, 2200, 'wind']],
      ['cloud-ninja', 'Ninja de la Nube', 'NU', '#bdc5f5', 22, ['Embestida eléctrica', 50, 1650, 'beam']],
      ['rain-ninja', 'Ninja de la Lluvia', 'LL', '#8fafd4', 25, ['Lluvia de senbon', 61, 2100, 'blade']],
    ]),
    minor: roster('naruto', 'minor', [
      ['haku', 'Haku', 'HA', '#a1e6ef', 33, ['Senbon de hielo', 75, 2150, 'blade'], ['Espejos de hielo', 75, 8800, 'clones']],
      ['mizuki', 'Mizuki', 'MI', '#b2aedf', 38, ['Shuriken gigante', 98, 2590, 'blade']],
      ['dosu', 'Dosu', 'DO', '#afa3d9', 36, ['Eco resonante', 78, 2220, 'vortex']],
      ['zaku', 'Zaku', 'ZA', '#94dacc', 37, ['Corte de aire', 99, 2670, 'wind']],
      ['kin', 'Kin', 'KI', '#bf9ac7', 35, ['Agujas con cascabel', 64, 1710, 'blade']],
      ['kankuro', 'Kankurō', 'KA', '#bd98f2', 43, ['Ataque de marioneta', 88, 2390, 'clones']],
      ['temari', 'Temari', 'TE', '#dcce94', 44, ['Vendaval del abanico', 92, 2360, 'wind']],
      ['kabuto', 'Kabuto', 'KB', '#b8c7ed', 45, ['Bisturí de chakra', 105, 2790, 'blade']],
      ['kimimaro', 'Kimimaro', 'KM', '#e6d5ea', 49, ['Danza ósea', 95, 2550, 'blade'], ['Lanza de hueso', 96, 8200, 'blade']],
      ['tayuya', 'Tayuya', 'TA', '#ee9ba2', 45, ['Melodía de ataque', 92, 2380, 'vortex']],
      ['jirobo', 'Jirōbō', 'JI', '#cfad82', 52, ['Embestida de tierra', 117, 2870, 'strike']],
      ['kidomaru', 'Kidōmaru', 'KD', '#b9c790', 46, ['Flecha de telaraña', 99, 2630, 'blade']],
      ['sakon-ukon', 'Sakon y Ukon', 'SU', '#baa5dd', 48, ['Golpe gemelo', 94, 2350, 'clones']],
      ['konan', 'Konan', 'KO', '#c5b0f4', 52, ['Cuchillas de papel', 100, 2640, 'blade'], ['Tormenta de papel', 94, 8500, 'wind']],
    ]),
    major: roster('naruto', 'major', [
      ['zabuza', 'Zabuza', 'ZB', '#87cfe0', 49, ['Corte de Kubikiribōchō', 108, 3900, 'blade'], ['Dragón de agua', 137, 11400, 'vortex']],
      ['orochimaru', 'Orochimaru', 'OR', '#cbb0f3', 57, ['Golpe serpentino', 108, 3200, 'strike'], ['Espada Kusanagi', 150, 9400, 'blade']],
      ['gaara', 'Gaara', 'GA', '#e8bb87', 65, ['Ráfaga de arena', 110, 3200, 'wind'], ['Ataúd de arena', 156, 9900, 'vortex']],
      ['itachi', 'Itachi', 'IT', '#ed9aa8', 73, ['Bola de fuego', 111, 3400, 'baryon'], ['Amaterasu', 166, 10300, 'spirit']],
      ['pain', 'Pain', 'PA', '#f3a985', 83, ['Receptor de chakra', 119, 3650, 'blade'], ['Shinra Tensei', 171, 11400, 'vortex']],
    ]),
  },
} satisfies Record<CharacterId, Record<EnemyKind, EnemyDefinition[]>>

export const allEnemies = Object.values(enemyRoster).flatMap(({ normal, minor, major }) => [...normal, ...minor, ...major])
