import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { bossTrials } from './boss-trials.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const includeHits = process.argv.includes('--hits')
const vite = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'silent',
  server: { middlewareMode: true, ws: false, watch: null },
})

try {
  const engine = await vite.ssrLoadModule('/src/engine/index.ts')
  const { items } = await vite.ssrLoadModule('/src/data/items.ts')
  const { stagesFor } = await vite.ssrLoadModule('/src/data/levels.ts')
  const { enemyLoadout, playerLoadout } = await vite.ssrLoadModule('/src/data/combatLoadout.ts')
  const { editInventory } = await vite.ssrLoadModule('/src/data/expeditionInventory.ts')
  const effectsApi = await vite.ssrLoadModule('/src/engine/effects/effects.ts')
  const { damageMultiplier } = effectsApi
  const itemsById = new Map(items.map((item) => [item.id, item]))
  const sum = (numbers) => numbers.reduce((total, number) => total + number, 0)
  const starters = { goku: ['power-pole', 'ki-orbs'], naruto: ['kunai', 'shadow-clones'] }
  const finalGoku = ['empowered-kamehameha', 'focused-spirit-bomb', 'superior-saiyan-armor', 'ki-barrier', 'completo-italiano']
  const finalNaruto = ['kyubi-rasengan', 'kurama-rasenshuriken', 'endurance-vest', 'chakra-barrier', 'completo-italiano']
  const scenarios = [
    ['Raditz/Raditz inicial', 'goku', 'goku-raditz', starters.goku],
    ['Raditz/solo Báculo', 'goku', 'goku-raditz', ['power-pole']],
    ['Cui/sin fusiones', 'goku', 'goku-cui', [...starters.goku, 'basic-shield', 'completo-italiano']],
    ['Cui/defensiva', 'goku', 'goku-cui', [...starters.goku, 'saiyan-armor', 'ki-barrier', 'vitality-orb']],
    ['Dodoria/sin fusiones', 'goku', 'goku-dodoria', [...starters.goku, 'kamehameha', 'completo-italiano']],
    ['Dodoria/defensiva', 'goku', 'goku-dodoria', [...starters.goku, 'saiyan-armor', 'ki-barrier', 'completo-italiano']],
    ['Piccolo/sin fusiones', 'goku', 'goku-piccolo', [...starters.goku, 'kamehameha', 'saiyan-armor', 'ki-barrier', 'completo-italiano']],
    ['Piccolo/fusiones intermedias', 'goku', 'goku-piccolo', ['kaioken-power-pole', 'double-ki-burst', 'saiyan-armor', 'ki-barrier', 'completo-italiano']],
    ['Ninja de la Niebla/inicial', 'naruto', 'naruto-mist-ninja', starters.naruto],
    ['Ninja de la Arena/inicial', 'naruto', 'naruto-sand-ninja', starters.naruto],
    ['Zabuza/sin fusiones', 'naruto', 'naruto-zabuza', [...starters.naruto, 'rasengan', 'chunin-vest', 'chakra-barrier', 'completo-italiano']],
    ['Zabuza/fusiones intermedias', 'naruto', 'naruto-zabuza', ['kyubi-clones', 'shadow-kunai', 'chunin-vest', 'chakra-barrier', 'completo-italiano']],
    ['Freezer/armas nivel 5', 'goku', 'goku-freezer', [...finalGoku, 'kaioken-power-pole']],
    ['Gaara/armas nivel 5', 'naruto', 'naruto-gaara', [...finalNaruto, 'shadow-kunai']],
    ['Majin Buu/control', 'goku', 'goku-majin-buu', finalGoku],
    ['Majin Buu/Migatte no Gokui', 'goku', 'goku-majin-buu', [...finalGoku, 'ultra-instinct']],
    ['Majin Buu/build precaria con Migatte', 'goku', 'goku-majin-buu', ['power-pole', 'ki-orbs', 'ultra-instinct']],
    ['Pain/control', 'naruto', 'naruto-pain', finalNaruto],
    ['Pain/Modo Barión', 'naruto', 'naruto-pain', [...finalNaruto, 'baryon-mode']],
    ['Pain/build precaria con Barión', 'naruto', 'naruto-pain', ['kunai', 'shadow-clones', 'baryon-mode']],
  ]

  function pack(ids, completedLevels) {
    const cells = engine.getInventoryCells(completedLevels)
    const tray = ids.map((id, index) => ({ id: `sim-${index}`, item: itemsById.get(id) }))
      .sort((left, right) => right.item.shape.length - left.item.shape.length)
    function place(bag, index) {
      const current = tray[index]
      if (!current) return bag
      for (const rotation of [0, 90, 180, 270]) {
        for (const anchor of cells) {
          const result = editInventory({ bag, tray: [{ ...current, rotation }] }, { kind: 'place', instanceId: current.id, anchor })
          if (result.ok && !result.fusion) {
            const completed = place(result.inventory.bag, index + 1)
            if (completed) return completed
          }
        }
      }
    }
    const bag = place(engine.createInventory(completedLevels), 0)
    if (!bag) throw new Error(`No hay una colocación legal para ${ids.join(', ')}`)
    return bag
  }

  function heroAt(character, stageIndex) {
    let hero = engine.createHeroProgress(character)
    const stages = stagesFor(character)
    for (let index = 0; index < stageIndex; index++) {
      const stage = stages[index]
      hero = engine.awardHeroVictory(character, hero, index, engine.rpgBalance.xp[stage.enemy.kind],
        hero.health, engine.heroBaseStats(character, hero.level).maxHealth).hero
    }
    return hero
  }

  function summarize(hits, elapsedSeconds) {
    const impacts = hits.map(({ damage, absorbed = 0 }) => damage + absorbed).filter((amount) => amount > 0)
    const health = sum(hits.map(({ damage }) => damage))
    const shield = sum(hits.map(({ absorbed = 0 }) => absorbed))
    return { impacts: impacts.length, min: impacts.length ? Math.min(...impacts) : null, max: impacts.length ? Math.max(...impacts) : null,
      mean: impacts.length ? sum(impacts) / impacts.length : 0, damage: health, absorbed: shield,
      dps: elapsedSeconds ? (health + shield) / elapsedSeconds : 0 }
  }

  const matches = scenarios.map(([name, character, enemyId, ids]) => {
    const stageIndex = stagesFor(character).findIndex(({ enemy }) => enemy.id === enemyId)
    const stage = stagesFor(character)[stageIndex]
    const hero = heroAt(character, stageIndex)
    const { definition } = playerLoadout(character, hero, pack(ids, stage.level - 1))
    const player = { ...definition, initialHealth: definition.maxHealth }
    const enemy = enemyLoadout(stage)
    const hits = { player: [], enemy: [] }
    const support = []
    const result = engine.advanceCombat(engine.createCombat({ player, enemy }), 120_000,
      (hit) => hits[hit.source].push(hit), (event) => support.push(event))
    const seconds = result.elapsedMs / 1000
    return { name, character, world: stage.level, stage: stage.number, level: hero.level, items: ids,
      seconds, status: result.status, playerHp: result.player.health, enemyHp: result.enemy.health,
      playerMaxHp: player.maxHealth, enemyMaxHp: enemy.maxHealth,
      player: summarize(hits.player, seconds), enemy: summarize(hits.enemy, seconds), support,
      ...(includeHits ? { hits } : {}) }
  })

  const firstStages = new Map()
  for (const character of ['goku', 'naruto']) {
    for (const stage of stagesFor(character)) {
      if (!firstStages.has(stage.enemy.id)) firstStages.set(stage.enemy.id, stage)
    }
  }
  const enemies = [...firstStages.values()].map((stage) => {
    const definition = enemyLoadout(stage)
    const weapons = definition.weapons.map((weapon, index) => ({
      name: stage.enemy.abilities[index].name, damage: weapon.damage, interval: weapon.cooldownMs / 1000,
    }))
    const dummy = { id: 'reference-goku', maxHealth: 1250, weapons: [] }
    const defeat = engine.advanceCombat(engine.createCombat({ player: dummy, enemy: definition }), 120_000)
    return { id: stage.enemy.id, name: stage.enemy.name, world: stage.level, stage: stage.number, kind: stage.enemy.kind,
      health: definition.maxHealth, armor: definition.armor, shield: definition.maxShield,
      weapons, dps: sum(weapons.map(({ damage, interval }) => damage / interval)),
      defeatSeconds: defeat.status === 'defeat' ? defeat.elapsedMs / 1000 : null }
  })

  const weapons = items.filter(({ category }) => category === 'Arma').map((item) => {
    const hero = engine.createHeroProgress(item.owner)
    const { definition } = playerLoadout(item.owner, hero, pack([item.id], 0))
    const combat = engine.createCombat({ player: definition, enemy: { id: 'dummy', maxHealth: 20_000, weapons: [] } })
    const weapon = combat.player.weapons[0]
    const interval = weapon.cooldownMs / 1000
    const bonuses = weapon.bonusHits?.map(({ damage }) => damage) ?? []
    const base = (weapon.damage + sum(bonuses)) / interval
    const armorDps = engine.mitigateDamage(base, 13)
    return { id: item.id, name: item.name, level: item.level, cells: item.shape.length,
      damage: weapon.damage, bonuses, interval, base, armorDps,
      openingDps: armorDps * damageMultiplier(combat.player.activeEffects, weapon.id),
      perCell: base / item.shape.length }
  })

  let campaigns
  if (process.argv.includes('--campaign')) {
    const { simulateShopCampaign } = await vite.ssrLoadModule('/src/data/campaignSimulation.ts')
    campaigns = ['goku', 'naruto'].map((character) => ({ character, ...simulateShopCampaign(character) }))
  }
  let purchaseRoutes
  if (process.argv.includes('--purchase-routes')) {
    const { simulateShopCampaign } = await vite.ssrLoadModule('/src/data/campaignSimulation.ts')
    purchaseRoutes = ['goku', 'naruto'].flatMap((character) => ['control', 'fusion', 'defense'].flatMap((route) =>
      [0, 1, 3].map((openingRefreshes) => ({ character, route, openingRefreshes, ...simulateShopCampaign(character, route, openingRefreshes) }))))
  }
  const includePreparation = process.argv.includes('--boss-preparation')
  const fusionRecipes = includePreparation ? (await vite.ssrLoadModule('/src/data/fusionRecipes.ts')).fusionRecipes : undefined
  const bosses = process.argv.includes('--bosses') || includePreparation
    ? bossTrials({ engine, stagesFor, heroAt, enemyLoadout, playerLoadout, pack, effectsApi, fusionRecipes })
    : undefined
  console.log(JSON.stringify({ enemies, weapons, matches, campaigns, bosses, purchaseRoutes }, null, 2))
} finally {
  await vite.close()
}
