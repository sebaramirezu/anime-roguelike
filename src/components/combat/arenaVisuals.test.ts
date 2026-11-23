import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../../adapters/gameEngineAdapter'
import { heroSprites } from '../../assets/heroSprites'
import { stagesFor } from '../../data/levels'
import { advanceCombat, createCombat } from '../../engine'
import { AnimatedSprite } from './AnimatedSprite'
import { CombatArena } from './CombatArena'
import { arenaPlayback, assetPath, enemyVisual, frameCount, frameSource, heroVisual, resolveClip, type SpriteClip } from './arenaVisuals'

const empty = new Set<string>()
const stages = stagesFor('goku')
const hit: CombatEvent = { id: '2', kind: 'damage', source: 'player', target: 'enemy', amount: 14, text: 'Golpe' }
const attack: CombatEvent = { id: '1', kind: 'attack', source: 'player', target: 'enemy', techniqueId: 'kamehameha', text: 'Kamehameha' }

describe('arena visual assets', () => {
  it('resolves both heroes and all existing encounters without changing enemy identifiers', () => {
    expect(heroVisual('goku').folder).not.toBe(heroVisual('naruto').folder)
    expect(stages.map((stage) => enemyVisual(stage).folder)).toContain('enemies/goku/raditz')
    expect(new Set(stages.map((stage) => enemyVisual(stage).shape))).toEqual(new Set(['trooper', 'guardian', 'colossus']))
    expect(assetPath('heroes/goku/idle.png')).toContain('/assets/heroes/goku/idle.png')
  })

  it('resolves PNG, sheets, sequences and missing poses', () => {
    const idle: SpriteClip = { kind: 'png', src: assetPath('idle.png') }
    const sheet: SpriteClip = { kind: 'sheet', width: 128, height: 96, count: 6, fps: 10, src: assetPath('attack.png') }
    const sequence: SpriteClip = { kind: 'sequence', width: 128, height: 128, fps: 8, sources: ['one.png', 'two.png'] }
    const visual = { ...heroVisual('goku'), clips: { idle, attack: sheet } }
    expect(resolveClip(visual, 'hurt')).toBe(idle)
    expect(frameCount(sheet)).toBe(6)
    expect(frameSource(sheet, 4, empty)).toBe(sheet.src)
    expect(frameSource(sequence, 1, empty)).toBe('two.png')
    expect(frameSource(sequence, 1, new Set(['two.png']))).toBeUndefined()
  })

  it('renders a placeholder without loading an image when no PNG is registered', () => {
    const html = renderToStaticMarkup(createElement(AnimatedSprite, {
      visual: enemyVisual(stages[0]), playback: { id: 'idle', pose: 'idle' }, facing: 'left',
    }))
    expect(html).toContain('sprite-placeholder')
    expect(html).toContain('data-facing="left"')
    expect(html).not.toContain('<img')
  })

  it('uses the local Itachi sprite for the major boss at the end of Naruto’s fourth level', () => {
    const stage = stagesFor('naruto').find(({ level, total, number }) => level === 4 && number === total)!
    expect(stage.enemy).toMatchObject({ id: 'naruto-itachi', kind: 'major' })
    const idle = resolveClip(enemyVisual(stage), 'idle')
    expect(idle).toMatchObject({ kind: 'png', src: expect.stringContaining('/naruto/itachi/idle.png') })
    expect(resolveClip(enemyVisual(stage), 'attack')).toEqual(idle)
  })

  it.each(['goku', 'naruto'] as const)('reuses the still image for the CSS poses of %s', (hero) => {
    for (const pose of ['idle', 'attack', 'hurt', 'death', 'special'] as const) {
      expect(resolveClip(heroVisual(hero), pose)).toEqual({ kind: 'png', src: heroSprites[hero].base })
    }
    const html = renderToStaticMarkup(createElement(AnimatedSprite, {
      visual: heroVisual(hero), playback: { id: 'attack-1', pose: 'attack' },
    }))
    expect(html).toContain(heroSprites[hero].base)
    expect(html).toContain('data-pose="attack"')
  })

  it('uses attested forms only for their matching hero and keeps the other artwork separate', () => {
    expect(resolveClip(heroVisual('goku', 'ultra-instinct'), 'special'))
      .toEqual({ kind: 'png', src: heroSprites.goku.forms['ultra-instinct'] })
    expect(resolveClip(heroVisual('naruto', 'nine-tails-chakra'), 'idle'))
      .toEqual({ kind: 'png', src: heroSprites.naruto.forms['nine-tails-chakra'] })
    expect(heroVisual('naruto', 'ultra-instinct')).toBe(heroVisual('naruto'))
    expect(heroSprites.naruto.references).toHaveLength(2)
  })
})

describe('arena event playback', () => {
  it('transitions from idle to special and hurt, then keeps the defeated fighter down', () => {
    expect(arenaPlayback([], 'player').pose).toBe('idle')
    expect(arenaPlayback([attack, hit], 'player')).toEqual({ id: '1', pose: 'special' })
    expect(arenaPlayback([attack, hit], 'enemy')).toEqual({ id: '2', pose: 'hurt' })
    expect(arenaPlayback([attack, hit, { ...hit, kind: 'death', id: '3' }], 'enemy')).toEqual({ id: '3', pose: 'death' })
  })

  it('preserves the same playback key when a snapshot repeats, and changes it for a new attack', () => {
    expect(arenaPlayback([attack, hit], 'player')).toEqual(arenaPlayback([{ ...attack }, { ...hit }], 'player'))
    expect(arenaPlayback([attack, hit, { ...attack, id: '4' }], 'player').id).toBe('4')
  })

  it('emits actual damage and one lethal event without changing the resolved state', () => {
    const initial = createCombat({
      player: { id: 'p', maxHealth: 20, weapons: [{ id: 'w', damage: 9, cooldownMs: 200 }] },
      enemy: { id: 'e', maxHealth: 13, weapons: [] },
    })
    const events: unknown[] = []
    const resolved = advanceCombat(initial, 200, (event) => events.push(event))
    expect(resolved).toEqual(advanceCombat(initial, 200))
    expect(events).toEqual([
      { source: 'player', weaponId: 'w', damage: 9, lethal: false },
      { source: 'player', weaponId: 'w', damage: 4, lethal: true },
    ])
    advanceCombat(resolved, 200, (event) => events.push(event))
    expect(events).toHaveLength(2)
  })

  it.each([['victory', 'Victoria'], ['defeat', 'Derrota']] as const)('renders %s in the arena', (outcome, label) => {
    const html = renderToStaticMarkup(createElement(CombatArena, {
      stage: stages[0], hero: 'goku', outcome, events: [attack, hit], leftHud: 'Goku', rightHud: stages[0].enemy.name,
    }))
    expect(html).toContain(label)
    expect(html).toContain('−14')
    expect(html).toContain('data-theme="beam"')
  })
})
