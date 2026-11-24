import type { Item } from '../../data/items'
import { rotateShape, type Rotation } from '../../engine'

export function ItemShape({ item, rotation = 0 }: { item: Item; rotation?: Rotation }) {
  const shape = rotateShape(item.shape, rotation)
  const width = Math.max(...shape.map(([column]) => column)) + 1
  const height = Math.max(...shape.map(([, row]) => row)) + 1
  return <div className="equipment-shape">
    <div className="shape-grid" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)` }}>
      {shape.map(([column, row]) => <span key={`${column}-${row}`} style={{ gridColumn: column + 1, gridRow: row + 1 }} />)}
    </div>
    <small>{item.shape.length} {item.shape.length === 1 ? 'casilla' : 'casillas'}</small>
  </div>
}
