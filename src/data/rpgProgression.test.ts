import { describe, expect, it } from 'vitest'
import { advanceCombat, awardHeroVictory, createCombat, createHeroProgress, createInventory, getInventoryCells, placeItem,
  mitigateDamage, rpgBalance, xpForNextLevel, type HeroProgress, type InventoryState } from '../engine'
import { enemyLoadout, playerLoadout } from './combatLoadout'
import { advanceEquipment, offersFor, recordVictory, recoverAfterVictory, startEquipmentSession, updateEquippedInventory } from './equipmentSession'
import { simulateShopCampaign } from './campaignSimulation'
import { editInventory, type ExpeditionInventory } from './expeditionInventory'
import { restoreExpedition, serializeExpedition } from './expeditionSave'
import { items, type Cell, type CharacterId } from './items'
import { stagesFor } from './levels'

const item = (id: string) => items.find((entry) => entry.id === id)!
const starter = (character: CharacterId) => startEquipmentSession(character, [
  item(character === 'goku' ? 'power-pole' : 'kunai'), item('basic-shield'),
])!

function equip(ids: string[], completedLevels = 0): InventoryState {
  let inventory: ExpeditionInventory = {
    bag: createInventory(completedLevels), tray: ids.map((id) => ({ id, item: item(id), rotation: 0 })),
  }
  for (const id of ids) {
    let placed = false
    for (const anchor of getInventoryCells(completedLevels)) {
      const result = editInventory(inventory, { kind: 'place', instanceId: id, anchor })
      if (!result.ok) continue
      inventory = result.inventory
      placed = true
      break
    }
    if (!placed) throw new Error(`No legal placement for ${id}`)
  }
  return inventory.bag
}

function placeAt(inventory: ExpeditionInventory, instanceId: string, anchor: Cell) {
  const result = editInventory(inventory, { kind: 'place', instanceId, anchor })
  if (!result.ok) throw new Error(result.error)
  return result.inventory
}

describe('health and defensive equipment', () => {
  it('starts Goku and Naruto at level one with individually balanced base health', () => {
    expect(createHeroProgress('goku')).toMatchObject({ level: 1, health: 1250, xp: 0 })
    expect(createHeroProgress('naruto')).toMatchObject({ level: 1, health: 1180, xp: 0 })
  })

  it.each([
    ['goku', ['vitality-orb', 'saiyan-armor', 'ki-barrier'], [180, 30, 260]],
    ['naruto', ['vitality-seal', 'chunin-vest', 'chakra-barrier'], [200, 26, 280]],
  ] as const)('applies the three equipped defensive bonuses for %s', (character, ids, amounts) => {
    const hero = createHeroProgress(character)
    const anchors: readonly Cell[] = [[1, 0], [1, 2], [3, 3]]
    const bag = ids.reduce((inventory, id, index) => placeItem(inventory, item(id), id, anchors[index]), createInventory())
    const loadout = playerLoadout(character, hero, bag)
    expect(loadout.bonuses).toEqual({ maxHealth: amounts[0], armor: amounts[1], maxShield: amounts[2] })
    expect(loadout.definition.maxHealth).toBe(hero.health + amounts[0])
    expect(createCombat({ player: loadout.definition, enemy: enemyLoadout(stagesFor(character)[0]) }).player.shield).toBe(amounts[2])
  })

  it('uses diminishing armor returns and never produces negative damage', () => {
    expect(mitigateDamage(100, 100)).toBe(50)
    expect(mitigateDamage(100, 200)).toBeCloseTo(33.33)
    expect(mitigateDamage(-10, 20)).toBe(0)
  })

  it('absorbs damage with shield first and sends only overflow to health', () => {
    const combat = createCombat({
      player: { id: 'p', maxHealth: 200, armor: 100, maxShield: 75, weapons: [] },
      enemy: { id: 'e', maxHealth: 200, weapons: [{ id: 'hit', damage: 100, cooldownMs: 1000 }] },
    })
    const events: unknown[] = []
    const first = advanceCombat(combat, 0, (event) => events.push(event))
    expect(first.player).toMatchObject({ health: 200, shield: 25 })
    const second = advanceCombat(first, 1000, (event) => events.push(event))
    expect(second.player).toMatchObject({ health: 175, shield: 0, maxShield: 75 })
    expect(events).toMatchObject([{ damage: 0, absorbed: 50 }, { damage: 25, absorbed: 25 }])
  })

  it('ignores the tray and clamps life after unequipping without allowing free healing', () => {
    const session = starter('goku')
    const inventory = { ...session.inventory, tray: [{ id: 'orb', item: item('vitality-orb'), rotation: 0 as const }] }
    expect(playerLoadout('goku', session.hero, inventory.bag).bonuses.maxHealth).toBe(0)
    const equipped = updateEquippedInventory(session, placeAt(inventory, 'orb', [1, 1]))
    expect(equipped.hero.health).toBe(1250)
    const result = editInventory(equipped.inventory, { kind: 'remove', instanceId: 'orb' })
    if (!result.ok) throw new Error(result.error)
    const removed = updateEquippedInventory({ ...equipped, hero: { ...equipped.hero, health: 1400 } }, result.inventory)
    expect(removed.hero.health).toBe(1250)
    expect(removed.inventory.tray[0].id).toBe('orb')
    expect(playerLoadout('goku', removed.hero, removed.inventory.bag).definition.maxHealth).toBe(1250)
  })

  it('does not duplicate a bonus when rotating or moving an equipped piece', () => {
    const session = starter('naruto')
    const inventory = { bag: equip(['chunin-vest']), tray: [] }
    const moved = editInventory(inventory, { kind: 'move', instanceId: 'chunin-vest', anchor: [2, 2] })
    if (!moved.ok) throw new Error(moved.error)
    const rotated = editInventory(moved.inventory, { kind: 'rotate', instanceId: 'chunin-vest' })
    if (!rotated.ok) throw new Error(rotated.error)
    expect(playerLoadout('naruto', session.hero, rotated.inventory.bag).bonuses.armor).toBe(26)
  })

  it('heals with Completo Italiano without restoring shield and reduces a cooldown by 15%', () => {
    const loadout = playerLoadout('goku', { ...createHeroProgress('goku'), health: 1000 },
      equip(['power-pole', 'completo-italiano', 'basic-shield']))
    const combat = createCombat({
      player: { ...loadout.definition, maxHealth: 1500 },
      enemy: { id: 'e', maxHealth: 1000, weapons: [{ id: 'hit', damage: 140, cooldownMs: 15000 }] },
    })
    const supports: unknown[] = []
    const first = advanceCombat(combat, 0, undefined, (event) => supports.push(event))
    expect(first.player).toMatchObject({ health: 1250, shield: 0 })
    expect(supports).toMatchObject([{ name: 'Completo Italiano', healed: 300, buff: true }])
    expect(first.player.activeEffects[0]).toMatchObject({ remainingMs: 10_000, cooldownRateMultiplier: 1 / 0.85 })
    const damage = loadout.definition.weapons[0].damage
    expect(advanceCombat(first, 1019).enemy.health).toBe(1000 - damage)
    expect(advanceCombat(first, 1020).enemy.health).toBe(1000 - 2 * damage)
    expect(advanceCombat(first, 10000).player.activeEffects).toHaveLength(0)
    expect(first.player.supports).toHaveLength(0)
  })
})

describe('experience and persistence', () => {
  const stage = stagesFor('goku')[0]

  it('awards XP only for victories and more for higher encounter ranks', () => {
    const session = starter('goku')
    expect(recordVictory(session, stage, 0, { outcome: 'defeat' })).toBe(session)
    expect(recordVictory(session, stage, 0, { outcome: 'victory', health: 900 }).hero.xp).toBe(24)
    expect(rpgBalance.xp.major).toBeGreaterThan(rpgBalance.xp.minor)
    expect(rpgBalance.xp.minor).toBeGreaterThan(rpgBalance.xp.normal)
  })

  it('levels up immediately, raises current and max life, and increases weapon damage', () => {
    const before = { ...createHeroProgress('goku'), xp: xpForNextLevel(1) - 1 }
    const earned = awardHeroVictory('goku', before, 0, 24, 1000, 1250)
    expect(earned).toMatchObject({ levelsGained: 1, healthIncrease: 105, damageIncrease: 7.5, hero: { level: 2, xp: 23, health: 1105 } })
    const bag = equip(['power-pole'])
    expect(playerLoadout('goku', earned.hero, bag).definition.maxHealth).toBe(1355)
    expect(playerLoadout('goku', earned.hero, bag).definition.weapons[0].damage).toBeGreaterThan(11)
  })

  it('can gain several levels in a single reward and caps current life', () => {
    const earned = awardHeroVictory('naruto', createHeroProgress('naruto'), 0,
      xpForNextLevel(1) + xpForNextLevel(2) + 5, 1180, 1180)
    expect(earned.hero).toMatchObject({ level: 3, xp: 5, health: 1380 })
  })

  it('restores an unclaimed victory without granting experience twice, then advances intact', () => {
    const run = starter('goku')
    const equipped = updateEquippedInventory(run, { bag: equip(['vitality-orb', 'power-pole']), tray: [] })
    const report = { outcome: 'victory', health: 1000, gold: 7 } as const
    const completed = recordVictory(equipped, stage, 0, report)
    const saved = restoreExpedition(serializeExpedition({ session: completed, stageIndex: 0 }))!
    expect(saved.session).toEqual(completed)
    expect(recordVictory(saved.session, stage, 0, report)).toBe(saved.session)
    const next = advanceEquipment(recoverAfterVictory(saved.session), 7, false)
    expect(next.pendingVictory).toBeUndefined()
    expect(next.hero.health).toBe(1430)
    expect(next.hero.xp).toBe(24)
    expect(restoreExpedition(serializeExpedition({ session: next, stageIndex: 1 }))?.session).toEqual(next)
  })

  it('migrates legacy saves without changing purchased offers, and grants XP only for cleared stages', () => {
    const run = starter('naruto')
    const legacyOffers = offersFor('naruto', 4, 3)
    const raw = JSON.parse(serializeExpedition({ session: { ...run, offers: legacyOffers, round: 4 }, stageIndex: 3 }))
    const migrated = restoreExpedition(JSON.stringify({ ...raw, version: 1, hero: undefined, offerItems: undefined }))!
    expect(migrated.session.hero).toMatchObject({ level: 1, xp: 72, lastVictory: 2 })
    expect(migrated.session.offers).toEqual(legacyOffers)
    expect(restoreExpedition(serializeExpedition(migrated))).toEqual(migrated)
  })

  it('preserves boss activation and remaining life when reloading a pending victory', () => {
    const stageIndex = 11
    const boss = stagesFor('goku')[stageIndex]
    const session = recordVictory(starter('goku'), boss, stageIndex, {
      outcome: 'victory', health: 684, durationSeconds: 51.4,
      bossPhase: { name: 'Ki concentrado', seconds: 27.1 }, enemyHealth: { current: 0, maximum: 3182 },
    })
    const saved = restoreExpedition(serializeExpedition({ session, stageIndex }))
    expect(saved?.session.pendingVictory).toEqual(session.pendingVictory)
    expect(saved?.session.hero).toEqual(session.hero)
  })

  it('preserves hero progression and equipment when gold resets and the backpack expands', () => {
    const run = starter('goku')
    const leveled = { ...run, hero: { ...run.hero, level: 2, xp: 50, lastVictory: 11 } }
    const next = advanceEquipment(recoverAfterVictory(leveled), 7, true)
    expect(next).toMatchObject({ gold: 0, hero: { level: 2, xp: 50, lastVictory: 11 } })
    expect(next.inventory.bag.completedLevels).toBe(1)
    expect(next.inventory.tray).toEqual(run.inventory.tray)
  })

  it('still fuses automatically and derives bonuses only from the resulting equipped instances', () => {
    const original = { bag: equip(['rasenshuriken', 'vitality-seal']), tray: [
      { id: 'variant', item: item('kurama-rasenshuriken'), rotation: 0 as const },
    ] }
    const anchor = getInventoryCells(0).find((cell) => {
      const result = editInventory(original, { kind: 'place', instanceId: 'variant', anchor: cell })
      return result.ok && result.fusion
    })!
    const fused = placeAt(original, 'variant', anchor)
    expect(fused.bag.items.map(({ itemId }) => itemId)).toContain('baryon-mode')
    expect(playerLoadout('naruto', createHeroProgress('naruto'), fused.bag).bonuses.maxHealth).toBe(200)
  })
})

describe('encounter balance', () => {
  it('delivers distinct opening damage by rank and makes a lone starter weapon a risky loadout', () => {
    const stages = stagesFor('goku')
    const [raditz, cui, dodoria, piccolo] = ['goku-raditz', 'goku-cui', 'goku-dodoria', 'goku-piccolo']
      .map((id) => enemyLoadout(stages.find(({ enemy }) => enemy.id === id)!))
    const impacts = [raditz, cui, dodoria, piccolo].map((enemy) => {
      const hits: number[] = []
      advanceCombat(createCombat({ player: { id: 'reference-goku', maxHealth: 1250, weapons: [] }, enemy }), 0,
        ({ damage }) => hits.push(damage))
      return hits
    })
    for (const [index, [minimum, maximum]] of [[45, 65], [75, 110], [75, 110], [100, 150]].entries()) {
      for (const damage of impacts[index]) {
        expect(damage).toBeGreaterThanOrEqual(minimum)
        expect(damage).toBeLessThanOrEqual(maximum)
      }
    }
    expect(impacts[2][0]).toBeGreaterThan(impacts[1][0])
    expect(dodoria.weapons[0].cooldownMs).toBeGreaterThan(cui.weapons[0].cooldownMs)
    const hero = createHeroProgress('goku')
    const solo = playerLoadout('goku', hero, equip(['power-pole']))
    const paired = playerLoadout('goku', hero, equip(['power-pole', 'ki-orbs']))
    expect(advanceCombat(createCombat({ player: solo.definition, enemy: raditz }), 120_000).status).toBe('defeat')
    const outcome = advanceCombat(createCombat({ player: paired.definition, enemy: raditz }), 120_000)
    expect(outcome.status).toBe('victory')
    expect(outcome.player.health).toBeLessThan(hero.health * 0.65)
  })

  it('scales the same foe by world and stage and distinguishes normal, minor and major encounters', () => {
    const stages = stagesFor('goku')
    const start = enemyLoadout(stages[0])
    const later = enemyLoadout(stages[4])
    const nextWorld = enemyLoadout(stages[12])
    const mini = enemyLoadout(stages[3])
    const boss = enemyLoadout(stages[11])
    expect(later.maxHealth).toBeGreaterThan(start.maxHealth)
    expect(nextWorld.maxHealth).toBeGreaterThan(later.maxHealth)
    expect(nextWorld.weapons[0].damage).toBeGreaterThan(start.weapons[0].damage)
    expect(mini.maxHealth).toBeGreaterThan(later.maxHealth)
    expect(boss.maxHealth).toBeGreaterThan(mini.maxHealth)
    expect(boss.armor).toBeGreaterThan(mini.armor!)
  })

  it('simulates real early, mid and late battles in both campaigns', () => {
    const results = []
    for (const character of ['goku', 'naruto'] as const) {
      const stages = stagesFor(character)
      const offense = character === 'goku'
        ? ['power-pole', 'ki-orbs', 'kamehameha', 'spirit-bomb']
        : ['kunai', 'shadow-clones', 'rasengan', 'rasenshuriken']
      const defenses = character === 'goku'
        ? ['saiyan-armor', 'ki-barrier', 'vitality-orb']
        : ['chunin-vest', 'chakra-barrier', 'vitality-seal']
      let hero: HeroProgress = createHeroProgress(character)
      for (const [index, stage] of stages.entries()) {
        if (index === 0 || index === 27 || index === 45) {
          const finalGear = character === 'goku'
            ? ['empowered-kamehameha', 'kaioken-power-pole', 'focused-spirit-bomb', 'superior-saiyan-armor']
            : ['kyubi-rasengan', 'shadow-kunai', 'kurama-rasenshuriken', 'endurance-vest']
          const selected = index === 0 ? offense.slice(0, 2)
            : index === 27 ? [...offense.slice(1, 3), 'guardian-bracers', ...defenses, 'completo-italiano']
            : [...finalGear, 'guardian-bracers', 'completo-italiano']
          const bag = equip(selected, stage.level - 1)
          const loadout = playerLoadout(character, hero, bag)
          const player = { ...loadout.definition, initialHealth: loadout.definition.maxHealth }
          const simulated = advanceCombat(createCombat({ player, enemy: enemyLoadout(stage) }), 120000)
          results.push({ character, enemy: stage.enemy.name, level: hero.level, seconds: +(simulated.elapsedMs / 1000).toFixed(1),
            remainingHealth: Math.round(simulated.player.health), result: simulated.status })
          expect(simulated.status, `${stage.enemy.name} tras ${simulated.elapsedMs / 1000}s, con ${simulated.enemy.health} HP restantes`).toBe('victory')
          const [minimum, maximum] = index === 0 ? [18, 30] : [35, 75]
          expect(simulated.elapsedMs / 1000).toBeGreaterThanOrEqual(minimum)
          expect(simulated.elapsedMs / 1000).toBeLessThanOrEqual(maximum)
        }
        const life = playerLoadout(character, hero, createInventory()).definition.maxHealth
        hero = awardHeroVictory(character, hero, index, rpgBalance.xp[stage.enemy.kind], life, life).hero
      }
      expect(hero.level).toBeGreaterThan(5)
      expect(hero.level).toBeLessThan(12)
    }
    console.log('Tiempo del motor (s), vida restante y resultado:', JSON.stringify(results))
  })

  it.each(['goku', 'naruto'] as const)('can finish all 46 stages with actual shop purchases and rewards (%s)', (character) => {
    const result = simulateShopCampaign(character, 'fusion')
    const last = result.stages.at(-1)!
    expect(last.outcome, `${last.enemy} tras ${last.seconds} s, con ${last.enemyHp} HP restantes`).toBe('victory')
    expect(result.stages).toHaveLength(46)
    expect(result.stages.filter(({ kind }) => kind === 'major').every(({ seconds, phaseAt }) =>
      seconds <= 75 && phaseAt !== undefined && phaseAt < seconds)).toBe(true)
    expect(result.hero.lastVictory).toBe(45)
    expect(result.hero.level).toBeGreaterThan(5)
    expect(result.fusions.some(({ level }) => level === 6)).toBe(false)
    const measuredFusions = simulateShopCampaign(character, 'fusion', 0, 3).fusions.map(({ level }) => level)
    expect(measuredFusions).toEqual(expect.arrayContaining([2, 3, 4]))
    const control = simulateShopCampaign(character)
    expect(control.stages.at(-1)).toMatchObject({ enemy: character === 'goku' ? 'Piccolo' : 'Zabuza', outcome: 'defeat' })
    const controlNormals = control.stages.filter(({ kind }) => kind === 'normal')
    expect(controlNormals.filter(({ seconds }) => seconds >= 18 && seconds <= 30).length).toBeGreaterThanOrEqual(6)
  })
})
