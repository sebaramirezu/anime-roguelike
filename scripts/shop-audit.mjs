const characters = ['goku', 'naruto']
const levels = [1, 2, 3, 4, 5]

export function auditShop({ stagesFor, items, stock, simulateShopCampaign, equipmentConfig }) {
  const stockSeeds = 2048
  const boardsPerStage = 8
  const campaignSeeds = 128
  const distribution = characters.map((character) => {
    const stages = stagesFor(character)
    const ids = stock.legendaryIngredients[character]
    const materials = ids.map((id) => items.find((item) => item.id === id))
    const worldResults = Array.from({ length: 5 }, (_, world) => ({
      world: world + 1, boards: 0, counts: [0, 0, 0, 0, 0], expected: [0, 0, 0, 0, 0],
    }))
    const availability = Array.from({ length: 3 }, (_, eligibleIngredients) => ({
      eligibleIngredients, boards: 0, basic: 0, advanced: 0, both: 0, emptyEightBoardWindows: 0,
    }))
    let invalidOffers = 0
    let boardsWithDuplicateIds = 0
    for (const [index, stage] of stages.entries()) {
      const world = worldResults[stage.level - 1]
      const weights = stock.effectiveShopWeights(character, index)
      const stageBoards = stockSeeds * boardsPerStage
      world.boards += stageBoards
      levels.forEach((level, i) => { world.expected[i] += weights[level] * stageBoards })
      const eligible = materials.filter((item) => stock.shopItemEligible(character, item, index)).length
      const window = availability[eligible]
      window.boards += stageBoards
      for (let seed = 0; seed < stockSeeds; seed++) {
        let windowFound = false
        for (let round = 0; round < boardsPerStage; round++) {
          const board = stock.rollShopStock(character, seed, index * boardsPerStage + round, index)
          if (new Set(board.map(({ id }) => id)).size !== board.length) boardsWithDuplicateIds++
          let basic = false
          let advanced = false
          for (const item of board) {
            if (item.level === 6 || !stock.shopItemEligible(character, item, index)) invalidOffers++
            else world.counts[item.level - 1]++
            if (item.id === ids[0]) basic = true
            if (item.id === ids[1]) advanced = true
          }
          if (basic) window.basic++
          if (advanced) window.advanced++
          if (basic && advanced) window.both++
          if (basic || advanced) windowFound = true
        }
        if (!windowFound) window.emptyEightBoardWindows++
      }
    }
    return { character, invalidOffers, boardsWithDuplicateIds, availability,
      worlds: worldResults.map(({ world, boards, counts, expected }) => ({
        world, boards, counts, expected: expected.map((count) => count / boards),
        observed: counts.map((count) => count / (boards * equipmentConfig.offerCount)),
      })) }
  })
  const campaigns = characters.flatMap((character) => ['fusion', 'defense', 'mythic', 'lateMythic'].map((route) => {
    const ids = stock.legendaryIngredients[character]
    const runs = Array.from({ length: campaignSeeds }, (_, seed) => {
      const result = simulateShopCampaign(character, route, 0, seed)
      const bought = result.purchases.filter(({ id }) => ids.includes(id))
      const mythic = result.fusions.find(({ level }) => level === 6)
      const last = result.stages.at(-1)
      return {
        seed, completed: result.hero.lastVictory + 1, reachedAdvancedUnlock: result.stages.some(({ world, number }) => world === 4 && number === 6),
        last: { enemy: last.enemy, seconds: last.seconds, hp: last.hp, outcome: last.outcome },
        bought, mythic, equippedMythic: Boolean(mythic && result.stages.some(({ items }) => items.includes(mythic.id))),
        refreshes: result.refreshes, mythicRefreshes: result.mythicRefreshes,
        mythicGold: bought.reduce((sum, { price }) => sum + price, result.mythicRefreshes * equipmentConfig.refreshPrice),
        levelsFused: levels.map((level) => result.fusions.filter((fusion) => fusion.level === level).length),
        fusionIds: [...new Set(result.fusions.map(({ id }) => id))],
      }
    })
    return { character, route, runs }
  }))
  return { stockSeeds, boardsPerStage, campaignSeeds, configured: stock.shopRarityWeights, distribution, campaigns }
}
