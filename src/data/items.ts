export type CharacterId = 'goku' | 'naruto'
export type Cell = readonly [column: number, row: number]
type Category = 'Arma' | 'Potenciación' | 'Escudo' | 'Armadura' | 'Guantes' | 'Casco' | 'Consumible' | 'Apoyo'
type Level = 1 | 2 | 3 | 4 | 5 | 6

type Effect =
  | { kind: 'heal'; maxHealthPercent: number }
  | { kind: 'weaponCooldownReduction'; percent: number; seconds?: number }
  | { kind: 'statBonus'; stat: 'escudo' | 'vida máxima' | 'defensa'; amount: number }
  | { kind: 'technique'; description: string }

const rarity = ['Común', 'Inusual', 'Raro', 'Épico', 'Legendario', 'Mítico'] as const

export type Item = {
  id: string
  name: string
  owner: CharacterId | 'shared'
  universe: string
  category: Category
  level: Level
  rarity: typeof rarity[number]
  price: number | null
  shape: readonly Cell[]
  description: string
  effects: readonly Effect[]
  icon: string
  iconPng?: string
}

const shapes = {
  single: [[0, 0]],
  pair: [[0, 0], [1, 0]],
  column: [[0, 0], [0, 1]],
  bend: [[0, 0], [0, 1], [1, 1]],
  square: [[0, 0], [1, 0], [0, 1], [1, 1]],
  cross: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  arc: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
} as const satisfies Record<string, readonly Cell[]>

const prices = [6, 9, 13, 18, 24, null] as const
const universes = { goku: 'Dragon Ball', naruto: 'Naruto', shared: 'Compartido' }

function item(
  owner: Item['owner'], id: string, name: string, level: Level, category: Category,
  shape: readonly Cell[], icon: string, description: string, effects: readonly Effect[],
): Item {
  return {
    owner, id, name, level, category, shape, icon, description, effects,
    universe: universes[owner], rarity: rarity[level - 1], price: prices[level - 1],
  }
}

function technique(
  owner: CharacterId, id: string, name: string, level: Level, shape: readonly Cell[],
  icon: string, description: string, effect: string, category: Category = 'Arma',
) {
  return item(owner, id, name, level, category, shape, icon, description, [
    { kind: 'technique', description: effect },
  ])
}

function vitalityItem(owner: CharacterId, id: string, name: string, level: Level, amountPerLevel: number, icon: string, description: string) {
  return item(owner, id, name, level, 'Apoyo', shapes.pair, icon, description,
    [{ kind: 'statBonus', stat: 'vida máxima', amount: level * amountPerLevel }])
}

export const items: readonly Item[] = [
  technique('goku', 'power-pole', 'Báculo', 1, shapes.column, '╱', 'El bastón extensible de Goku.', 'Golpe físico de alcance extensible.'),
  technique('goku', 'ki-orbs', 'Esferas de Ki', 2, shapes.pair, '✦', 'Ráfagas de energía concentrada.', 'Proyectiles de Ki consecutivos.'),
  technique('goku', 'kaioken', 'Kaioken', 3, shapes.bend, '▲', 'Goku lleva su Ki más allá de su límite.', 'Potenciación temporal del usuario.', 'Potenciación'),
  technique('goku', 'kamehameha', 'Kamehameha', 4, shapes.square, '≋', 'La onda de energía de la Escuela Tortuga.', 'Descarga frontal de Ki concentrado.'),
  technique('goku', 'spirit-bomb', 'Genkidama', 5, shapes.cross, '●', 'Una esfera que reúne energía de seres vivos.', 'Ataque de energía acumulada.'),
  technique('goku', 'focused-spirit-bomb', 'Genkidama concentrada', 5, shapes.arc, '◉', 'Variante de fusión que concentra la energía de una Genkidama.', 'Carga de Ki concentrada.'),
  technique('goku', 'ultra-instinct', 'Migatte no Gokui', 6, shapes.cross, '✧', 'El cuerpo responde por instinto.', 'Transformación definitiva centrada en la reacción instintiva.', 'Potenciación'),
  technique('naruto', 'kunai', 'Kunai', 1, shapes.pair, '◇', 'Una herramienta ninja ligera.', 'Ataque rápido con kunai.'),
  technique('naruto', 'shadow-clones', 'Clones de sombra', 2, shapes.column, '◈', 'Copias físicas de Naruto que actúan en conjunto.', 'Ataque coordinado mediante clones.'),
  technique('naruto', 'nine-tails-chakra', 'Chakra del Kyubi', 3, shapes.bend, '▲', 'Un manto de chakra de Kurama.', 'Potenciación temporal del usuario.', 'Potenciación'),
  technique('naruto', 'rasengan', 'Rasengan', 4, shapes.square, '◎', 'Chakra en rotación comprimido en una esfera.', 'Impacto de chakra concentrado.'),
  technique('naruto', 'rasenshuriken', 'Rasenshuriken', 5, shapes.cross, '✣', 'Un Rasengan que incorpora chakra de viento.', 'Técnica de viento arrojadiza.'),
  technique('naruto', 'kurama-rasenshuriken', 'Rasenshuriken de Kurama', 5, shapes.arc, '✺', 'Variante de fusión reforzada con chakra de Kurama.', 'Descarga de viento y chakra de Kurama.'),
  technique('naruto', 'baryon-mode', 'Modo Barión', 6, shapes.cross, '✸', 'Técnica definitiva en la que Naruto y Kurama consumen su chakra para generar energía.', 'Transformación extraordinaria de duración limitada.', 'Potenciación'),
  item('shared', 'basic-shield', 'Escudo básico', 1, 'Escudo', shapes.single, '⬟', 'Broquel compacto para la primera línea.', [{ kind: 'statBonus', stat: 'escudo', amount: 90 }]),
  item('shared', 'reinforced-armor', 'Armadura reforzada', 2, 'Armadura', shapes.square, '▣', 'Coraza de placas superpuestas.', [{ kind: 'statBonus', stat: 'vida máxima', amount: 145 }]),
  item('shared', 'swift-gloves', 'Guantes rápidos', 2, 'Guantes', shapes.pair, '»', 'Guantes ligeros para encadenar técnicas.', [{ kind: 'weaponCooldownReduction', percent: 8 }]),
  item('shared', 'protective-helmet', 'Casco protector', 1, 'Casco', shapes.single, '⌂', 'Casco ligero para la expedición.', [{ kind: 'statBonus', stat: 'defensa', amount: 9 }]),
  item('shared', 'healing-potion', 'Poción de curación', 1, 'Consumible', shapes.single, '✚', 'Un frasco para recuperar fuerzas.', [{ kind: 'heal', maxHealthPercent: 10 }]),
  item('shared', 'ward-charm', 'Talismán de guardia', 2, 'Apoyo', shapes.column, '✧', 'Un sello que refuerza la guardia.', [{ kind: 'statBonus', stat: 'escudo', amount: 120 }]),
  item('shared', 'completo-italiano', 'Completo Italiano', 2, 'Consumible', shapes.pair, '🌭', 'Pan con palta, tomate y mayonesa para recuperar el ritmo.', [
    { kind: 'heal', maxHealthPercent: 20 },
    { kind: 'weaponCooldownReduction', percent: 15, seconds: 10 },
  ]),
  vitalityItem('goku', 'vitality-orb', 'Esfera de Vitalidad', 2, 90, '●', 'Ki estable que aumenta la vida máxima.'),
  item('goku', 'saiyan-armor', 'Armadura Saiyajin', 3, 'Armadura', shapes.square, '▣', 'Coraza de batalla que reduce el daño recibido.', [{ kind: 'statBonus', stat: 'defensa', amount: 30 }]),
  item('goku', 'ki-barrier', 'Barrera de Ki', 3, 'Escudo', shapes.bend, '⬟', 'Reserva de Ki protectora al comenzar el combate.', [{ kind: 'statBonus', stat: 'escudo', amount: 260 }]),
  vitalityItem('naruto', 'vitality-seal', 'Sello de Vitalidad', 2, 100, '◈', 'Sello que aumenta la vida máxima.'),
  item('naruto', 'chunin-vest', 'Chaleco Chunin', 3, 'Armadura', shapes.square, '▣', 'Chaleco reforzado que reduce el daño recibido.', [{ kind: 'statBonus', stat: 'defensa', amount: 26 }]),
  item('naruto', 'chakra-barrier', 'Barrera de Chakra', 3, 'Escudo', shapes.bend, '⬟', 'Reserva de chakra para el inicio del combate.', [{ kind: 'statBonus', stat: 'escudo', amount: 280 }]),
]

export const newDefensiveItems = new Set(items.slice(-6).map(({ id }) => id))

export function catalogFor(character: CharacterId) {
  return items.filter(({ owner }) => owner === character || owner === 'shared')
}
