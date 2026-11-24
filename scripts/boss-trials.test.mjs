import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { beforeAll, expect, it } from 'vitest'

let bosses
let purchaseRoutes

beforeAll(async () => {
  const simulator = fileURLToPath(new URL('./simulate-combat.mjs', import.meta.url))
  const { stdout } = await promisify(execFile)(process.execPath, [simulator, '--boss-preparation', '--purchase-routes'],
    { maxBuffer: 5 * 1024 * 1024 })
  const results = JSON.parse(stdout)
  bosses = results.bosses
  purchaseRoutes = results.purchaseRoutes
}, 30_000)

it('bounds the best insufficient build below the requirements for each major boss', () => {
  expect(bosses).toHaveLength(10)
  for (const boss of bosses) {
    expect(boss.guaranteed, boss.id).toBe(true)
    expect(boss.latestSurvival, boss.id).toBeLessThan(boss.earliestKill)
    expect(boss.unavoidable, boss.id).toBeGreaterThanOrEqual(boss.envelope.endurance)
    for (const match of boss.matches.filter(({ tier }) => ['A', 'B', 'M'].includes(tier))) {
      expect(match.outcome, `${boss.id} · ${match.tier}${match.route}`).toBe('defeat')
    }
  }
})

it('keeps every boss beatable by a good build and keeps exceptional victories sensitive to starting health', () => {
  for (const boss of bosses) {
    const winner = boss.matches.find(({ tier, outcome }) => tier === 'C' && outcome === 'victory')
    expect(winner, boss.id).toBeDefined()
    expect(winner.phaseAt, boss.id).toBeGreaterThan(0)
    expect(winner.phaseAt, boss.id).toBeLessThan(winner.seconds)
    expect(winner.seconds, boss.id).toBeGreaterThanOrEqual(44)
    expect(winner.seconds, boss.id).toBeLessThanOrEqual(75)
  }
  const exceptional = bosses.flatMap((boss) => boss.matches.filter(({ tier }) => tier === 'E'))
  expect(exceptional.some(({ outcome, route }) => outcome === 'victory' && route < 3)).toBe(true)
  expect(exceptional.some(({ outcome, route }) => outcome === 'defeat' && route === 3)).toBe(true)
})

it('compares the same C, D and E loadouts at the four entry health levels', () => {
  const rows = bosses.flatMap(({ preparation }) => preparation.health)
  for (const healthPercent of [55, 72, 85, 100]) {
    for (const tier of ['C', 'D', 'E']) {
      const matches = rows.filter((row) => row.tier === tier && row.healthPercent === healthPercent)
      expect(matches).toHaveLength(20)
      for (const { startingHp, maxHp } of matches) {
        expect(startingHp / maxHp).toBeCloseTo(healthPercent / 100)
      }
    }
  }
  const victories = (tier, percent) => rows.filter(({ tier: grade, outcome, healthPercent }) =>
    grade === tier && healthPercent === percent && outcome === 'victory').length
  expect(victories('D', 72)).toBeGreaterThan(victories('C', 72))
  expect(victories('E', 55)).toBeLessThan(victories('E', 100))
  expect(rows.some((row) => row.outcome === 'victory' && row.withoutTemporary?.outcome === 'defeat')).toBe(true)
})

it('tracks the protection, healing and outcomes of equipment swaps on the real engine', () => {
  const piccolo = bosses.find(({ id }) => id === 'goku-piccolo').preparation.equipment
  const at72 = (name, replacement) => piccolo.find((row) =>
    row.name === name && row.healthPercent === 72 && row.replacement.join(',') === replacement)
  expect(at72('shield', '').outcome).toBe('defeat')
  expect(at72('shield', 'reinforced-shield')).toMatchObject({ outcome: 'victory', absorbed: { enemy: 320 } })
  expect(at72('personal-armor', 'vitality-orb,saiyan-armor').outcome).toBe('defeat')
  expect(at72('personal-armor', 'superior-saiyan-armor').outcome).toBe('victory')
  const potion = at72('hybrid-healing', 'superior-potion')
  expect(potion.outcome).toBe('victory')
  expect(potion.activations).toContainEqual(expect.objectContaining({
    target: 'player', techniqueId: 'superior-potion', healed: 616,
  }))
})

it('reaches all five major bosses in each campaign with enough life from regular progression', () => {
  for (const character of ['goku', 'naruto']) {
    const expedition = purchaseRoutes.find((row) => row.character === character && row.route === 'fusion' && row.openingRefreshes === 0)
    expect(expedition.stages).toHaveLength(46)
    const major = expedition.stages.filter(({ kind }) => kind === 'major')
    expect(major).toHaveLength(5)
    for (const stage of major) {
      expect(stage.outcome).toBe('victory')
      expect(stage.startingHp / stage.maxHp).toBeGreaterThanOrEqual(0.85)
    }
  }
})
