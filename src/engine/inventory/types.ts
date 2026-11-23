export type Cell = readonly [column: number, row: number]
export type Rotation = 0 | 90 | 180 | 270

/** Minimal shape contract; catalog Item values can be passed directly. */
export interface SpatialItemDefinition {
  id: string
  shape: readonly Cell[]
}

export interface ItemInstance {
  instanceId: string
  itemId: string
  shape: readonly Cell[]
  anchor: Cell
  rotation: Rotation
}

export interface InventoryState {
  completedLevels: number
  items: readonly ItemInstance[]
  combatActive: boolean
}

export interface ItemAdjacency {
  firstInstanceId: string
  secondInstanceId: string
  touchingCells: readonly [Cell, Cell]
}
