import type { BonusHit } from '../engine'

export type CharacterId = 'goku' | 'naruto'
export type Cell = readonly [column: number, row: number]
type Category = 'Arma' | 'Potenciación' | 'Escudo' | 'Armadura' | 'Guantes' | 'Casco' | 'Consumible' | 'Apoyo'
type Level = 1 | 2 | 3 | 4 | 5 | 6

export type ItemEffect =
  | { kind: 'heal'; maxHealthPercent: number; belowHealthPercent?: number }
  | { kind: 'weaponCooldownReduction'; percent: number; seconds?: number; belowHealthPercent?: number }
  | { kind: 'statBonus'; stat: 'escudo' | 'vida máxima' | 'defensa'; amount: number }
  | { kind: 'technique'; description: string }
  | { kind: 'weaponProfile'; damage: number; cooldownMs: number; bonusHits?: readonly BonusHit[] }
  | { kind: 'inheritWeapons' }
  | { kind: 'damageBoost'; percent: number; seconds: number; belowHealthPercent?: number }
  | { kind: 'damageReduction'; percent: number; seconds: number; belowHealthPercent: number }

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
  effects: readonly ItemEffect[]
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
  shape: readonly Cell[], icon: string, description: string, effects: readonly ItemEffect[],
): Item {
  return {
    owner, id, name, level, category, shape, icon, description, effects,
    universe: universes[owner], rarity: rarity[level - 1], price: prices[level - 1],
  }
}

function fusionItem(...definition: Parameters<typeof item>): Item {
  return { ...item(...definition), price: null }
}

function technique(
  owner: CharacterId, id: string, name: string, level: Level, shape: readonly Cell[],
  icon: string, description: string, effect: string, profile?: Omit<Extract<ItemEffect, { kind: 'weaponProfile' }>, 'kind'>,
) {
  const effects: ItemEffect[] = [{ kind: 'technique', description: effect }]
  if (profile) effects.push({ kind: 'weaponProfile', ...profile })
  return item(owner, id, name, level, profile ? 'Arma' : 'Potenciación', shape, icon, description, effects)
}

function vitalityItem(owner: CharacterId, id: string, name: string, level: Level, amountPerLevel: number, icon: string, description: string) {
  return item(owner, id, name, level, 'Apoyo', shapes.pair, icon, description,
    [{ kind: 'statBonus', stat: 'vida máxima', amount: level * amountPerLevel }])
}

const baseItems: readonly Item[] = [
  technique('goku', 'power-pole', 'Báculo', 1, shapes.column, '╱', 'El bastón extensible de Goku.', 'Golpe físico de alcance extensible.',
    { damage: 18, cooldownMs: 1200 }),
  technique('goku', 'ki-orbs', 'Esferas de Ki', 2, shapes.pair, '✦', 'Ráfagas de energía concentrada.', 'Proyectiles de Ki.',
    { damage: 25, cooldownMs: 1400 }),
  technique('goku', 'kaioken', 'Kaioken', 3, shapes.bend, '▲', 'Goku lleva su Ki más allá de su límite.', 'Ingrediente para el Báculo Kaioken, que aumenta temporalmente su propio daño.'),
  technique('goku', 'kamehameha', 'Kamehameha', 4, shapes.square, '≋', 'La onda de energía de la Escuela Tortuga.', 'Descarga frontal de Ki concentrado.',
    { damage: 63, cooldownMs: 2300 }),
  technique('goku', 'spirit-bomb', 'Genkidama', 5, shapes.cross, '●', 'Una esfera que reúne energía de seres vivos.', 'Ataque de energía acumulada.',
    { damage: 126, cooldownMs: 3650 }),
  technique('goku', 'focused-spirit-bomb', 'Genkidama concentrada', 5, shapes.arc, '◉', 'Variante de fusión que concentra la energía de una Genkidama.', 'Carga de Ki concentrada.',
    { damage: 110, cooldownMs: 3075 }),
  fusionItem('goku', 'ultra-instinct', 'Migatte no Gokui', 6, 'Potenciación', shapes.cross, '✧', 'El cuerpo responde por instinto.', [
    { kind: 'inheritWeapons' },
    { kind: 'damageBoost', percent: 55, seconds: 11, belowHealthPercent: 48 },
    { kind: 'damageReduction', percent: 35, seconds: 11, belowHealthPercent: 48 },
  ]),
  technique('naruto', 'kunai', 'Kunai', 1, shapes.pair, '◇', 'Una herramienta ninja ligera.', 'Ataque rápido con kunai.',
    { damage: 15, cooldownMs: 1020 }),
  technique('naruto', 'shadow-clones', 'Clones de sombra', 2, shapes.column, '◈', 'Copias físicas de Naruto que actúan en conjunto.', 'Ataque coordinado mediante clones.',
    { damage: 17, cooldownMs: 1400, bonusHits: [{ kind: 'clone', damage: 8 }] }),
  technique('naruto', 'nine-tails-chakra', 'Chakra del Kyubi', 3, shapes.bend, '▲', 'Un manto de chakra de Kurama.', 'Cambia el aspecto de Naruto en combate y sirve como ingrediente de fusión.'),
  technique('naruto', 'rasengan', 'Rasengan', 4, shapes.square, '◎', 'Chakra en rotación comprimido en una esfera.', 'Impacto de chakra concentrado.',
    { damage: 60, cooldownMs: 2100 }),
  technique('naruto', 'rasenshuriken', 'Rasenshuriken', 5, shapes.cross, '✣', 'Un Rasengan que incorpora chakra de viento.', 'Técnica de viento arrojadiza.',
    { damage: 98, cooldownMs: 2900 }),
  technique('naruto', 'kurama-rasenshuriken', 'Rasenshuriken de Kurama', 5, shapes.arc, '✺', 'Variante de fusión reforzada con chakra de Kurama.', 'Descarga de viento y chakra de Kurama.',
    { damage: 90, cooldownMs: 2950, bonusHits: [{ kind: 'energy', damage: 19 }] }),
  fusionItem('naruto', 'baryon-mode', 'Modo Barión', 6, 'Potenciación', shapes.cross, '✸', 'Naruto y Kurama consumen su chakra para generar energía.', [
    { kind: 'damageBoost', percent: 90, seconds: 7, belowHealthPercent: 48 },
    { kind: 'weaponCooldownReduction', percent: 24, seconds: 7, belowHealthPercent: 48 },
  ]),
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

export const items: readonly Item[] = [
  ...baseItems,
  fusionItem('shared', 'superior-potion', 'Poción Superior', 2, 'Consumible', shapes.pair, '✚', 'Dos dosis en un frasco de concentración superior.', [
    { kind: 'heal', maxHealthPercent: 35 },
  ]),
  fusionItem('shared', 'reinforced-shield', 'Escudo Reforzado', 2, 'Escudo', shapes.column, '⬟', 'Dos capas de metal amortiguan los golpes.', [
    { kind: 'statBonus', stat: 'escudo', amount: 320 },
  ]),
  fusionItem('shared', 'vital-barrier', 'Barrera Vital', 2, 'Escudo', shapes.square, '✙', 'Un campo protector que libera energía curativa al debilitarse su portador.', [
    { kind: 'statBonus', stat: 'escudo', amount: 150 },
    { kind: 'heal', maxHealthPercent: 15, belowHealthPercent: 45 },
  ]),
  fusionItem('shared', 'armored-cuirass', 'Coraza Blindada', 3, 'Armadura', shapes.square, '▣', 'Una coraza cerrada que dispersa el impacto de cada golpe.', [
    { kind: 'statBonus', stat: 'defensa', amount: 45 },
  ]),
  fusionItem('shared', 'guardian-bracers', 'Brazales Guardianes', 3, 'Guantes', shapes.pair, '»', 'Refuerzos ligeros que protegen sin frenar los ataques.', [
    { kind: 'statBonus', stat: 'escudo', amount: 160 },
    { kind: 'weaponCooldownReduction', percent: 8 },
  ]),
  fusionItem('shared', 'vital-helmet', 'Casco Vital', 2, 'Casco', shapes.single, '⌂', 'Un casco compacto con un núcleo de vitalidad.', [
    { kind: 'statBonus', stat: 'defensa', amount: 15 },
    { kind: 'statBonus', stat: 'vida máxima', amount: 150 },
  ]),
  fusionItem('shared', 'bastion-armor', 'Armadura Bastión', 3, 'Armadura', shapes.square, '▣', 'Un broquel integrado protege las uniones de la coraza.', [
    { kind: 'statBonus', stat: 'defensa', amount: 28 },
    { kind: 'statBonus', stat: 'escudo', amount: 200 },
  ]),
  fusionItem('shared', 'guardian-relic', 'Reliquia del Guardián', 4, 'Apoyo', shapes.bend, '✦', 'Una reliquia que combina protección y una reserva de curación de emergencia.', [
    { kind: 'statBonus', stat: 'escudo', amount: 400 },
    { kind: 'heal', maxHealthPercent: 20, belowHealthPercent: 40 },
  ]),
  fusionItem('goku', 'energized-power-pole', 'Báculo Energizado', 2, 'Arma', shapes.column, '╱', 'El bastón libera una descarga de Ki con cada golpe.', [
    { kind: 'weaponProfile', damage: 26, cooldownMs: 1500, bonusHits: [{ kind: 'energy', damage: 16 }] },
  ]),
  fusionItem('goku', 'double-ki-burst', 'Doble Ráfaga de Ki', 3, 'Arma', shapes.pair, '✦', 'Dos esferas coordinadas para disparar ráfagas de energía más frecuentes.', [
    { kind: 'weaponProfile', damage: 24, cooldownMs: 1360, bonusHits: [{ kind: 'energy', damage: 18 }] },
  ]),
  fusionItem('goku', 'kaioken-power-pole', 'Báculo Kaioken', 4, 'Arma', shapes.bend, '╱', 'El Kaioken intensifica temporalmente los golpes y las descargas del bastón.', [
    { kind: 'weaponProfile', damage: 35, cooldownMs: 1520, bonusHits: [{ kind: 'energy', damage: 17 }] },
    { kind: 'damageBoost', percent: 30, seconds: 10 },
  ]),
  fusionItem('goku', 'empowered-kamehameha', 'Kamehameha Potenciado', 5, 'Arma', shapes.square, '≋', 'La doble ráfaga concentra el Ki en un haz de alto impacto.', [
    { kind: 'weaponProfile', damage: 88, cooldownMs: 2250 },
  ]),
  fusionItem('goku', 'superior-saiyan-armor', 'Armadura Saiyajin Superior', 4, 'Armadura', shapes.square, '▣', 'Blindaje Saiyajin alimentado por una reserva estable de Ki.', [
    { kind: 'statBonus', stat: 'vida máxima', amount: 300 },
    { kind: 'statBonus', stat: 'defensa', amount: 40 },
  ]),
  fusionItem('naruto', 'twin-kunai', 'Kunais Gemelos', 2, 'Arma', shapes.pair, '◇', 'Dos hojas lanzadas en la misma secuencia.', [
    { kind: 'weaponProfile', damage: 16, cooldownMs: 1130, bonusHits: [{ kind: 'physical', damage: 15 }] },
  ]),
  fusionItem('naruto', 'shadow-kunai', 'Kunais de las Sombras', 3, 'Arma', shapes.pair, '◇', 'Un clon repite el lanzamiento desde otro ángulo.', [
    { kind: 'weaponProfile', damage: 19, cooldownMs: 1200, bonusHits: [{ kind: 'clone', damage: 16 }] },
  ]),
  fusionItem('naruto', 'kyubi-clones', 'Clones del Kyubi', 4, 'Arma', shapes.bend, '◈', 'El chakra del Kyubi potencia el ataque coordinado de los clones.', [
    { kind: 'weaponProfile', damage: 24, cooldownMs: 1400, bonusHits: [{ kind: 'clone', damage: 12 }, { kind: 'clone', damage: 10 }] },
  ]),
  fusionItem('naruto', 'kyubi-rasengan', 'Rasengan del Kyubi', 5, 'Arma', shapes.square, '◎', 'Un Rasengan amplificado por una oleada temporal de chakra.', [
    { kind: 'weaponProfile', damage: 69, cooldownMs: 2100, bonusHits: [{ kind: 'energy', damage: 13 }] },
    { kind: 'damageBoost', percent: 30, seconds: 10 },
  ]),
  fusionItem('naruto', 'endurance-vest', 'Chaleco de Resistencia', 4, 'Armadura', shapes.square, '▣', 'Un chaleco reforzado con un sello de vitalidad.', [
    { kind: 'statBonus', stat: 'vida máxima', amount: 300 },
    { kind: 'statBonus', stat: 'defensa', amount: 38 },
  ]),
]

export function describeItemEffect(effect: ItemEffect): string {
  switch (effect.kind) {
    case 'heal': return `Cura ${effect.maxHealthPercent}% de la vida máxima una vez por combate${effect.belowHealthPercent === undefined
      ? ' al llegar al 65% de vida' : ` al bajar del ${effect.belowHealthPercent}% de vida`}.`
    case 'weaponCooldownReduction': return `Reduce ${effect.percent}% el tiempo de reutilización de armas${effect.seconds
      ? ` durante ${effect.seconds} segundos${effect.belowHealthPercent === undefined
        ? '' : ` al bajar del ${effect.belowHealthPercent}% de vida, una vez por combate`}` : ''}.`
    case 'statBonus': return `+${effect.amount} de ${effect.stat === 'defensa' ? 'armadura' : effect.stat === 'escudo' ? 'escudo máximo' : effect.stat}.`
    case 'technique': return effect.description
    case 'inheritWeapons': return 'Conserva la Genkidama y la Genkidama concentrada, cada una con su propia recarga.'
    case 'weaponProfile': {
      const hitLabels = { physical: 'golpe físico', energy: 'descarga de energía', clone: 'ataque de clon' }
      const extras = effect.bonusHits?.map(({ kind, damage }) => `${hitLabels[kind]} de ${damage}`).join(', ')
      return `${effect.damage} de daño base cada ${(effect.cooldownMs / 1000).toLocaleString('es-CL')} s${extras ? ` y ${extras} por ataque` : ''}.`
    }
    case 'damageBoost': return `+${effect.percent}% de daño ${effect.belowHealthPercent === undefined
      ? `de esta técnica durante los primeros ${effect.seconds} s del combate`
      : `de armas durante ${effect.seconds} s al bajar del ${effect.belowHealthPercent}% de vida, una vez por combate`}.`
    case 'damageReduction': return `Reduce ${effect.percent}% del daño recibido durante ${effect.seconds} s al bajar del ${effect.belowHealthPercent}% de vida, una vez por combate.`
  }
}

export function catalogFor(character: CharacterId) {
  return items.filter(({ owner }) => owner === character || owner === 'shared')
}
