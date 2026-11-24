const tiers = {
  goku: [
    [['power-pole', 'ki-orbs'], ['power-pole', 'basic-shield', 'healing-potion']],
    [['power-pole', 'ki-orbs', 'saiyan-armor', 'ki-barrier', 'healing-potion'], ['kamehameha', 'protective-helmet', 'completo-italiano']],
    [['kaioken-power-pole', 'double-ki-burst', 'superior-saiyan-armor', 'ki-barrier', 'completo-italiano'], ['energized-power-pole', 'kamehameha', 'armored-cuirass', 'guardian-bracers', 'superior-potion']],
    [['empowered-kamehameha', 'kaioken-power-pole', 'superior-saiyan-armor', 'guardian-bracers', 'completo-italiano'], ['focused-spirit-bomb', 'empowered-kamehameha', 'superior-saiyan-armor', 'ki-barrier', 'completo-italiano']],
  ],
  naruto: [
    [['kunai', 'shadow-clones'], ['kunai', 'basic-shield', 'healing-potion']],
    [['kunai', 'shadow-clones', 'chunin-vest', 'chakra-barrier', 'healing-potion'], ['rasengan', 'protective-helmet', 'completo-italiano']],
    [['kyubi-clones', 'shadow-kunai', 'endurance-vest', 'chakra-barrier', 'completo-italiano'], ['twin-kunai', 'rasengan', 'armored-cuirass', 'guardian-bracers', 'superior-potion']],
    [['kyubi-rasengan', 'shadow-kunai', 'endurance-vest', 'guardian-bracers', 'completo-italiano'], ['kurama-rasenshuriken', 'kyubi-rasengan', 'endurance-vest', 'chakra-barrier', 'completo-italiano']],
  ],
}
const forms = { goku: 'ultra-instinct', naruto: 'baryon-mode' }
const healthLevels = [55, 72, 85, 100]
const sum = (values) => values.reduce((a, b) => a + b, 0)
const cycle = (weapon) => weapon.damage + sum((weapon.bonusHits ?? []).map(({ damage }) => damage))
const rawDps = (weapons) => sum(weapons.map((weapon) => cycle(weapon) * 1000 / weapon.cooldownMs))

function capacities(engine, definition, { cooldownRate, damageMultiplier, receivedDamageMultiplier }) {
  const state = engine.createCombat({ player: definition, enemy: { id: 'reference', maxHealth: 1, weapons: [] } }).player
  const effects = state.activeEffects.concat(state.supports.flatMap(({ effects }) =>
    engine.applyEffects({ ...state, activeEffects: [], weaponCooldownsMs: [] }, effects).target.activeEffects))
  const outputs = state.weapons.map((weapon) => cycle(weapon) * damageMultiplier(effects, weapon.id))
  const healing = sum(state.supports.flatMap(({ effects }) =>
    effects.filter(({ kind }) => kind === 'heal').map(({ maxHealthPercent }) => maxHealthPercent * state.maxHealth / 100)))
  return {
    sustained: rawDps(state.weapons), firstVolleyUpper: sum(outputs), healingUpper: healing,
    dpsUpper: sum(outputs.map((damage, index) => damage * cooldownRate(effects) * 1000 / state.weapons[index].cooldownMs)),
    enduranceUpper: (state.health + state.shield + healing) * (1 + state.armor / 100) / receivedDamageMultiplier(effects),
  }
}

function runDuel(engine, player, boss) {
  const damage = { player: 0, enemy: 0 }
  const absorbed = { player: 0, enemy: 0 }
  const activations = []
  let openingDamage = 0
  let state = engine.createCombat({ player, enemy: boss })
  while (state.status === 'running') {
    const opening = state.elapsedMs < 10_000 - 1e-6
    state = engine.advanceCombat(state, 100, (event) => {
      damage[event.source] += event.damage
      absorbed[event.source] += event.absorbed ?? 0
      if (opening && event.source === 'player') openingDamage += event.damage + (event.absorbed ?? 0)
    }, (event) => activations.push(event))
  }
  const seconds = state.elapsedMs / 1000
  const dps = (side) => (damage[side] + absorbed[side]) / seconds
  return {
    outcome: state.status, seconds, hp: state.player.health, enemyHp: state.enemy.health,
    phaseAt: (activations.find(({ target }) => target === 'enemy')?.elapsedMs ?? NaN) / 1000,
    activations, damage, absorbed, dps: { player: dps('player'), enemy: dps('enemy'), opening: openingDamage / Math.min(10, seconds) },
    startingHp: player.initialHealth, maxHp: player.maxHealth, shield: player.maxShield, armor: player.armor,
  }
}

function withoutTemporaryEffects(player) {
  return {
    ...player,
    openingEffects: [],
    supports: player.supports.map((support) => ({
      ...support, effects: support.effects.filter(({ kind }) => kind === 'heal'),
    })).filter(({ effects }) => effects.length),
  }
}

function comparePreparation(engine, boss, character, variants, loadout, fusionRecipes) {
  const atHealth = (definition, healthPercent) => ({ ...definition, initialHealth: definition.maxHealth * healthPercent / 100 })
  const health = variants.slice(2, 5).flatMap((builds, tier) => builds.slice(0, 2).flatMap((ids, route) => {
    const { definition, cells } = loadout(ids)
    return healthLevels.map((healthPercent) => {
      const player = atHealth(definition, healthPercent)
      const duel = runDuel(engine, player, boss)
      const hasTemporary = player.openingEffects.length > 0 || player.supports.some(({ effects }) => effects.some(({ kind }) => kind !== 'heal'))
      return { tier: 'CDE'[tier], route: route + 1, healthPercent, ids, cells, ...duel, hasTemporary,
        ...(tier < 2 && hasTemporary && { withoutTemporary: runDuel(engine, withoutTemporaryEffects(player), boss) }) }
    })
  }))
  const personalDefense = character === 'goku' ? 'superior-saiyan-armor' : 'endurance-vest'
  const personalWeapon = character === 'goku' ? 'kaioken-power-pole' : 'kyubi-clones'
  const barrier = character === 'goku' ? 'ki-barrier' : 'chakra-barrier'
  const split = (id) => fusionRecipes.find(({ result }) => result === id).ingredients
  const comparisons = [
    { name: 'healing', build: 'C2', item: 'superior-potion', alternatives: [[], ['healing-potion'], split('superior-potion'), ['completo-italiano']] },
    { name: 'hybrid-healing', build: 'C1', item: 'completo-italiano', alternatives: [[], ['healing-potion'], ['superior-potion']] },
    { name: 'shield', build: 'C1', item: barrier, alternatives: [[], ['basic-shield'], split('reinforced-shield'), ['reinforced-shield']] },
    { name: 'personal-armor', build: 'C1', item: personalDefense, alternatives: [split(personalDefense)] },
    { name: 'cuirass', build: 'C2', item: 'armored-cuirass', alternatives: [split('armored-cuirass')] },
    { name: 'bracers', build: 'D1', item: 'guardian-bracers', alternatives: [split('guardian-bracers')] },
    { name: 'offensive-fusion', build: 'C1', item: personalWeapon, alternatives: [split(personalWeapon)] },
  ]
  const equipment = comparisons.flatMap(({ name, build, item, alternatives }) => {
    const { ids: original } = health.find(({ tier, route }) => `${tier}${route}` === build)
    return [[item], ...alternatives].flatMap((replacement) => {
      const ids = original.flatMap((id) => id === item ? replacement : [id])
      const { definition, cells } = loadout(ids)
      return healthLevels.map((healthPercent) => ({
        name, build, replacement, ids, cells, healthPercent, ...runDuel(engine, atHealth(definition, healthPercent), boss),
      }))
    })
  })
  return { health, equipment }
}

export function bossTrials({ engine, stagesFor, heroAt, enemyLoadout, playerLoadout, pack, effectsApi, fusionRecipes }) {
  return ['goku', 'naruto'].flatMap((character) => stagesFor(character).flatMap((stage, index) => {
    if (stage.enemy.kind !== 'major') return []
    const hero = heroAt(character, index)
    const boss = enemyLoadout(stage)
    const baseEhp = (boss.maxHealth + boss.maxShield) * (1 + boss.armor / 100)
    const phase = boss.supports[0]
    const phaseEffects = engine.applyEffects({ health: boss.maxHealth, maxHealth: boss.maxHealth, activeEffects: [], weaponCooldownsMs: [] }, phase.effects).target.activeEffects
    const phaseDps = sum(boss.weapons.map((weapon) => cycle(weapon) * effectsApi.damageMultiplier(phaseEffects, weapon.id)
      * effectsApi.cooldownRate(phaseEffects) * 1000 / weapon.cooldownMs))
    const variants = tiers[character].map((variants) => variants.map((ids) => [...ids]))
    if (stage.level === 2 || stage.level === 3) {
      for (const build of variants[2]) build.push(character === 'goku' ? 'ki-orbs' : 'shadow-clones')
    }
    if (stage.level >= 3) variants[3][1].push('protective-helmet')
    if (stage.level >= 4) {
      variants[2][0].push(character === 'goku' ? 'spirit-bomb' : 'rasenshuriken')
      variants[2][1].push(character === 'goku' ? 'ki-orbs' : 'shadow-kunai')
      variants[3][0].push(character === 'goku' ? 'focused-spirit-bomb' : 'kurama-rasenshuriken')
    }
    variants.push(variants[3].map((ids) => [...ids, forms[character]]))
    variants[4].push([...variants[3][1], forms[character]])
    variants.push([[...variants[0][0], forms[character]]])

    function loadout(ids) {
      const bag = pack(ids, stage.level - 1)
      const { definition } = playerLoadout(character, hero, bag)
      return { definition, cells: sum(bag.items.map(({ shape }) => shape.length)) }
    }
    const matches = variants.flatMap((variants, tier) => variants.map((ids, route) => {
      const { definition, cells } = loadout(ids)
      const player = { ...definition, initialHealth: definition.maxHealth * (tier === 4 && route === 2 ? 0.55 : 1) }
      const limits = capacities(engine, player, effectsApi)
      return { tier: 'ABCDEM'[tier], route: route + 1, ids, cells, ...runDuel(engine, player, boss), caps: limits }
    }))
    const insufficient = matches.filter(({ tier }) => tier === 'A' || tier === 'B')
    const cap = (key) => Math.ceil(Math.max(...insufficient.map(({ caps }) => caps[key])))
    const envelope = { dps: cap('dpsUpper'), volley: cap('firstVolleyUpper'), endurance: cap('enduranceUpper') }
    const earliestKill = (baseEhp - envelope.volley) / envelope.dps
    // Count only attacks strictly before the earliest kill. The player wins ties.
    const attacks = boss.weapons.flatMap((weapon) => {
      const count = Math.max(0, Math.ceil(earliestKill * 1000 / weapon.cooldownMs - 1e-9))
      return Array.from({ length: count }, (_, index) => ({ seconds: index * weapon.cooldownMs / 1000, damage: cycle(weapon) }))
    }).sort((a, b) => a.seconds - b.seconds)
    let unavoidable = 0
    let latestSurvival
    for (const attack of attacks) {
      unavoidable += attack.damage
      if (unavoidable >= envelope.endurance) latestSurvival ??= attack.seconds
    }
    return [{ id: stage.enemy.id, name: stage.enemy.name, character, world: stage.level, hp: boss.maxHealth, shield: boss.maxShield,
      armor: boss.armor, ehp: baseEhp, baseDps: rawDps(boss.weapons), phaseDps, phase, envelope, earliestKill, unavoidable, latestSurvival,
      guaranteed: latestSurvival !== undefined && latestSurvival < earliestKill, matches,
      ...(fusionRecipes && { preparation: comparePreparation(engine, boss, character, variants, loadout, fusionRecipes) }) }]
  }))
}
