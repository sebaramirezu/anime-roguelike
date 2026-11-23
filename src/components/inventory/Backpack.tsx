import { useState } from 'react'
import type { Cell, Item } from '../../data/items'
import type { TrayEntry } from '../../data/equipmentSession'

const backpackMasks = {
  32: ['.####.', '######', '######', '######', '######', '.####.'],
  42: Array<string>(6).fill('#######'),
  49: Array<string>(7).fill('#######'),
}

export function ItemShape({ item }: { item: Item }) {
  const width = Math.max(...item.shape.map(([column]) => column)) + 1
  const height = Math.max(...item.shape.map(([, row]) => row)) + 1
  return <div className="equipment-shape">
    <div className="shape-grid" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)` }}>
      {item.shape.map(([column, row]) => <span key={`${column}-${row}`} style={{ gridColumn: column + 1, gridRow: row + 1 }} />)}
    </div>
    <small>{item.shape.length} {item.shape.length === 1 ? 'casilla' : 'casillas'}</small>
  </div>
}

export function ItemThumbnail({ item, className = '' }: { item: Item; className?: string }) {
  return item.imageSrc
    ? <img className={`item-thumbnail ${className}`.trim()} src={item.imageSrc} alt="" />
    : <b className={`item-symbol ${className}`.trim()} aria-hidden="true">{item.icon}</b>
}

export function Tray({ entries, selected, onSelect }: {
  entries: readonly TrayEntry[]
  selected?: string
  onSelect?: (id: string) => void
}) {
  return <section className="panel equipment-tray">
    <h3>Bandeja temporal <span>{entries.length}</span></h3>
    {entries.length === 0 && <p>La bandeja está vacía.</p>}
    <ul>{entries.map(({ id, item }) => <li key={id}>
      {onSelect
        ? <button type="button" aria-pressed={id === selected} onClick={() => onSelect(id)}>
            <span className="tray-item-name"><ItemThumbnail item={item} />{item.name}</span><ItemShape item={item} />
          </button>
        : <div className="tray-entry">
            <span className="tray-item-name"><ItemThumbnail item={item} />{item.name}</span><ItemShape item={item} />
          </div>}
    </li>)}</ul>
  </section>
}

export function Backpack({ entries, capacity = 32 }: {
  entries: readonly TrayEntry[]
  capacity?: keyof typeof backpackMasks
}) {
  const [selected, setSelected] = useState<string>()
  const [anchor, setAnchor] = useState<Cell>([1, 1])
  const item = entries.find(({ id }) => id === selected)?.item
  const mask = backpackMasks[capacity]
  const preview = new Set(item?.shape.map(([column, row]) => `${column + anchor[0]}-${row + anchor[1]}`))

  return <div className="inventory-panel panel">
    <div className="panel-title"><span>MOCHILA ESPACIAL</span><b>{capacity} CASILLAS HABILITADAS</b></div>
    <div className="inventory-grid" style={{ gridTemplateColumns: `repeat(${mask[0].length}, minmax(0, 1fr))` }}>
      {mask.flatMap((line, row) => [...line].map((cell, column) => {
        const key = `${column}-${row}`
        const blocked = cell === '.'
        return <button key={key} type="button"
          className={`inventory-cell${blocked ? ' locked' : ''}${preview.has(key) ? ' shape-preview' : ''}`}
          disabled={blocked || !item}
          aria-label={`Fila ${row + 1}, columna ${column + 1}${blocked ? ', bloqueada' : ''}${preview.has(key) ? ', vista previa' : ''}`}
          onClick={() => setAnchor([column, row])}
        >
          {item && preview.has(key) && key === `${anchor[0]}-${anchor[1]}` && <ItemThumbnail item={item} className="inventory-preview-art" />}
        </button>
      }))}
    </div>
    <p className="equipment-note">El motor de inventario está pendiente de conexión. Selecciona un objeto y pulsa una casilla para ver su forma. La vista previa no valida ni guarda posiciones.</p>
    {item && <p className="equipment-note" role="status">Vista previa de {item.name} · fila {anchor[1] + 1}, columna {anchor[0] + 1}</p>}
    <Tray entries={entries} selected={selected} onSelect={setSelected} />
  </div>
}
