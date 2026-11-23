import type { ItemInstance } from '../inventory/types'
import { getItemAdjacencies } from '../inventory/inventory'
import type { InventoryState } from '../inventory/types'

export type SynergyRule =
  | { id: string; kind: 'global'; itemId: string; effect: string; value: number }
  | { id: string; kind: 'adjacent'; sourceItemId: string; targetItemId: string; effect: string; value: number }
  | { id: string; kind: 'category'; category: string; effect: string; value: number }
  | { id: string; kind: 'specificPair'; firstItemId: string; secondItemId: string; effect: string; value: number }

export interface SynergyItem extends ItemInstance {
  category?: string
}

export interface SynergyBonus {
  ruleId: string
  sourceInstanceId: string
  targetInstanceId?: string
  effect: string
  value: number
}

/** Rebuilds bonuses from base inventory each call, so results never compound. */
export function calculateSynergies(
  inventory: InventoryState,
  items: readonly SynergyItem[],
  rules: readonly SynergyRule[],
): readonly SynergyBonus[] {
  const byId = new Map(items.map((item) => [item.instanceId, item]))
  const bonuses: SynergyBonus[] = []
  const adjacencies = getItemAdjacencies(inventory)
  for (const rule of rules) {
    if (rule.kind === 'global') {
      for (const item of items.filter((entry) => entry.itemId === rule.itemId)) {
        bonuses.push({ ruleId: rule.id, sourceInstanceId: item.instanceId, effect: rule.effect, value: rule.value })
      }
    } else if (rule.kind === 'category') {
      for (const item of items.filter((entry) => entry.category === rule.category)) {
        bonuses.push({ ruleId: rule.id, sourceInstanceId: item.instanceId, effect: rule.effect, value: rule.value })
      }
    } else if (rule.kind === 'adjacent') {
      for (const { firstInstanceId: firstId, secondInstanceId: secondId } of adjacencies) {
        const first = byId.get(firstId)
        const second = byId.get(secondId)
        if (first?.itemId === rule.sourceItemId && second?.itemId === rule.targetItemId) {
          bonuses.push({ ruleId: rule.id, sourceInstanceId: firstId, targetInstanceId: secondId, effect: rule.effect, value: rule.value })
        }
        if (first?.itemId === rule.targetItemId && second?.itemId === rule.sourceItemId) {
          bonuses.push({ ruleId: rule.id, sourceInstanceId: secondId, targetInstanceId: firstId, effect: rule.effect, value: rule.value })
        }
      }
    } else {
      for (const { firstInstanceId: firstId, secondInstanceId: secondId } of adjacencies) {
        const first = byId.get(firstId)
        const second = byId.get(secondId)
        if (first?.itemId === rule.firstItemId && second?.itemId === rule.secondItemId
          || first?.itemId === rule.secondItemId && second?.itemId === rule.firstItemId) {
          bonuses.push({ ruleId: rule.id, sourceInstanceId: firstId, targetInstanceId: secondId, effect: rule.effect, value: rule.value })
        }
      }
    }
  }
  return bonuses
}
