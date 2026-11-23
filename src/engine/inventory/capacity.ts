import type { Cell } from './types'

export type InventoryCapacity = 32 | 42 | 49
export type InventoryMask = readonly (readonly boolean[])[]

export function getInventoryCapacity(completedLevels: number): InventoryCapacity {
  if (!Number.isInteger(completedLevels) || completedLevels < 0) {
    throw new Error('completedLevels must be a non-negative integer.')
  }
  if (completedLevels === 0) return 32
  if (completedLevels === 1) return 42
  return 49
}

export function getInventoryMask(completedLevels: number): InventoryMask {
  const capacity = getInventoryCapacity(completedLevels)
  const rows = capacity === 49 ? 7 : 6
  const columns = capacity === 32 ? 6 : 7
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      capacity !== 32 || row !== 0 && row !== rows - 1 || column !== 0 && column !== columns - 1,
    ),
  )
}

export function getInventoryCells(completedLevels: number): readonly Cell[] {
  return getInventoryMask(completedLevels).flatMap((row, y) =>
    row.flatMap((open, x) => open ? [[x, y] as const] : []),
  )
}
