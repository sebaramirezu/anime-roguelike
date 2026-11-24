import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { CombatUpdate } from '../adapters/gameEngineAdapter'
import { liveCombat } from '../adapters/liveCombat'
import { bossPhaseFor } from '../data/bossPhases'
import { startEquipmentSession } from '../data/equipmentSession'
import { items } from '../data/items'
import { stagesFor } from '../data/levels'
import { canPlaceItem, createHeroProgress, createInventory, getInventoryCells, placeItem } from '../engine'
import { formatCombatAmount } from '../shared/formatCombatAmount'
import { CombatScreen, ResultScreen, StageNotice } from './ExpeditionScreens'

const stage = stagesFor('goku').find(({ enemy }) => enemy.id === 'goku-cui')!
const render = (update: CombatUpdate, encounter = stage) => renderToStaticMarkup(createElement(CombatScreen, {
  stage: encounter, update, hero: { id: 'goku', name: 'Goku' }, demo: false, error: null, onBack() {}, onReport() {},
}))

it('shows boss specialties and equipped stats while keeping phase details for combat', () => {
  const lookup = (id: string) => items.find((item) => item.id === id)!
  const session = startEquipmentSession('goku', [lookup('power-pole'), lookup('completo-italiano')])!
  const bag = ['power-pole', 'healing-potion', 'basic-shield'].reduce((inventory, id) => {
    const item = lookup(id)
    const anchor = getInventoryCells(0).find((cell) => canPlaceItem(inventory, item, cell))!
    return placeItem(inventory, item, id, anchor)
  }, session.inventory.bag)
  const callbacks = { demo: false, onStart() {}, onBack() {} }
  const encounters = (['goku', 'naruto'] as const).flatMap((character) =>
    stagesFor(character).filter(({ enemy }) => enemy.kind === 'major'))
  for (const boss of encounters) {
    const html = renderToStaticMarkup(createElement(StageNotice, { ...callbacks, stage: boss }))
    expect(html).toContain('<p class="boss-rank">Jefe principal</p>')
    expect(html).toContain(`<h2>${boss.enemy.name}</h2>`)
    expect(html).toContain('<dt>Ofensiva</dt>')
    expect(html).toContain('<dt>Defensa</dt>')
    expect(html).toContain('puede entrar en una fase fuerte')
    expect(html).not.toContain(bossPhaseFor(boss.enemy)!.name)
  }
  const { tray } = session.inventory
  const adjusted = { ...session, hero: { ...session.hero, health: 900 }, inventory: { bag, tray: tray.filter(({ item }) => item.id !== 'power-pole') } }
  const html = renderToStaticMarkup(createElement(StageNotice, { ...callbacks, stage: encounters[0], session: adjusted }))
  expect(html).toContain('Vida de entrada · 72%')
  expect(html).toContain('900 / 1250')
  expect(html).toContain('<dt>Escudo inicial</dt><dd>90</dd>')
  expect(html).toContain('Poción de curación')
  expect(html).toContain('Cura 10% de la vida máxima')
  expect(html).not.toContain('Completo Italiano')
  const normal = renderToStaticMarkup(createElement(StageNotice, { ...callbacks, stage, session: adjusted }))
  expect(normal).not.toContain('boss-brief')
  expect(normal).not.toContain('Mochila equipada')
})

it('uses shield and health from the same live snapshot and renders the correct damage for both fighters', () => {
  const updates: CombatUpdate[] = []
  const controller = new AbortController()
  const armed = placeItem(createInventory(), items.find(({ id }) => id === 'power-pole')!, 'weapon', [1, 1])
  const inventory = placeItem(armed, items.find(({ id }) => id === 'basic-shield')!, 'shield', [3, 2])
  vi.useFakeTimers()
  try {
    liveCombat.startCombat({ character: 'goku', stage, inventory }, (update) => updates.push(update), controller.signal)
    vi.advanceTimersByTime(100)
    const [initial, first] = updates
    const seenHealthDamage = new Set<string>()
    for (const side of ['player', 'enemy'] as const) {
      expect(first[side]!.shield).toBeLessThan(initial[side]!.shield!)
      expect(first[side]!.health).toBe(initial[side]!.health)
      expect(first.recentEvents?.some(({ kind, target }) => kind === 'damage' && target === side)).toBe(false)
      expect(first.recentEvents?.some(({ kind, target }) => kind === 'shield' && target === side)).toBe(true)
    }

    for (let tick = 0; tick < 200 && seenHealthDamage.size < 2; tick++) {
      const previous = updates.at(-1)!
      vi.advanceTimersByTime(100)
      const current = updates.at(-1)!
      const previousIds = new Set(previous.recentEvents?.map(({ id }) => id))
      const newEvents = current.recentEvents?.filter(({ id }) => !previousIds.has(id)) ?? []
      for (const side of ['player', 'enemy'] as const) {
        const before = previous[side]!
        const after = current[side]!
        const dealt = newEvents.filter(({ kind, target }) => kind === 'damage' && target === side)
        const blocked = newEvents.filter(({ kind, target }) => kind === 'shield' && target === side)
        expect(before.shield! - after.shield!).toBeCloseTo(blocked.reduce((sum, { amount }) => sum + amount!, 0))
        expect(before.health! - after.health!).toBeCloseTo(dealt.reduce((sum, { amount }) => sum + amount!, 0))
        if (!dealt.length || seenHealthDamage.has(side)) continue
        seenHealthDamage.add(side)
        expect(after.shield).toBe(0)
        expect(blocked).toHaveLength(1)
        const html = render(current)
        const hud = html.split(`class="arena-hud" data-side="${side}"`)[1].split('class="arena-hud"')[0]
        expect(hud).toContain(`<span>Escudo</span><strong>0 / ${after.maxShield}</strong>`)
        expect(hud).toContain(`<span>Vida</span><strong>${formatCombatAmount(after.health!)} / ${after.maxHealth}</strong>`)
        expect(html).toContain(`class="arena-number arena-shield-number" data-side="${side}">−${formatCombatAmount(blocked[0].amount!)}`)
        expect(html).toContain(`class="arena-number arena-damage" data-side="${side}">−${formatCombatAmount(dealt[0].amount!)}`)
      }
    }
    expect(seenHealthDamage).toEqual(new Set(['player', 'enemy']))
  } finally {
    controller.abort()
    vi.useRealTimers()
  }
})

it('shows the phase and aura from a resolved boss event and preserves the activation in the report', () => {
  const boss = stagesFor('goku').at(-1)!
  const completed = boss.level - 1
  const inventory = ['empowered-kamehameha', 'kaioken-power-pole', 'focused-spirit-bomb', 'superior-saiyan-armor',
    'guardian-bracers', 'completo-italiano'].reduce((bag, id) => {
    const item = items.find((entry) => entry.id === id)!
    const anchor = getInventoryCells(completed).find((cell) => canPlaceItem(bag, item, cell))!
    return placeItem(bag, item, id, anchor)
  }, createInventory(completed))
  const hero = { ...createHeroProgress('goku'), level: 8, health: 2500 }
  const updates: CombatUpdate[] = []
  const controller = new AbortController()
  vi.useFakeTimers()
  try {
    liveCombat.startCombat({ character: 'goku', stage: boss, inventory, hero }, (update) => updates.push(update), controller.signal)
    expect(updates[0].enemy?.bossPhase).toBeUndefined()
    vi.advanceTimersByTime(120_000)
    const active = updates.find(({ enemy }) => enemy?.bossPhase)!
    const events = new Map(updates.flatMap(({ recentEvents = [] }) => recentEvents.map((event) => [event.id, event] as const)))
    const transforms = [...events.values()].filter(({ kind, source }) => kind === 'transform' && source === 'enemy')
    expect(transforms).toEqual([expect.objectContaining({ techniqueId: 'goku-majin-buu-phase', visual: { theme: 'baryon', special: true } })])
    const html = render(active, boss)
    expect(html).toContain('Fase fuerte · Regeneración de Majin Buu')
    expect(html).toContain('data-boss-phase="Regeneración de Majin Buu"')
    expect(html).toContain('class="arena-aura" data-theme="baryon" data-side="enemy"')
    expect(html).toContain('class="arena-number arena-heal" data-side="enemy"')
    const finished = updates.at(-1)!
    expect(finished.status).toBe('finished')
    if (finished.status !== 'finished') return
    expect(finished.report.bossPhase).toEqual({ name: 'Regeneración de Majin Buu', seconds: expect.any(Number) })
    const report = renderToStaticMarkup(createElement(ResultScreen, { stage: boss, report: finished.report, onContinue() {}, onMap() {} }))
    expect(report).toContain('<dt>Fase fuerte</dt><dd>Regeneración de Majin Buu')
    expect(report).toContain('Vida restante del jefe')
  } finally {
    controller.abort()
    vi.useRealTimers()
  }
})
