import { useRef, useState } from 'react'
import type { Cell, Item } from '../../data/items'
import { inventoryView, previewPlacement, type ExpeditionInventory, type InventoryCommand, type InventoryResponse, type UnplacedEntry } from '../../data/expeditionInventory'
import { rotateShape, type Rotation } from '../../engine'
import { FusionGuide } from './FusionGuide'
import { ItemIcon } from './ItemIcon'

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

export function Tray({ entries, selected, onSelect }: {
  entries: readonly UnplacedEntry[]
  selected?: string
  onSelect?: (id: string) => void
}) {
  return <section className="panel equipment-tray">
    <h3>Bandeja temporal <span>{entries.length}</span></h3>
    {entries.length === 0 && <p>La bandeja está vacía.</p>}
    <ul>{entries.map(({ id, item, rotation }) => <li key={id}>
      {onSelect
        ? <button type="button" aria-pressed={id === selected} onClick={() => onSelect(id)}>
            <span className="item-name"><ItemIcon item={item} />{item.name}</span><ItemShape item={item} rotation={rotation} />
          </button>
        : <div className="tray-entry">
            <span className="item-name"><ItemIcon item={item} />{item.name}</span><ItemShape item={item} rotation={rotation} />
          </div>}
    </li>)}</ul>
  </section>
}

export function Backpack({ inventory, onCommand }: {
  inventory: ExpeditionInventory
  onCommand: (command: InventoryCommand) => InventoryResponse
}) {
  const [selected, setSelected] = useState<string>()
  const [anchor, setAnchor] = useState<Cell>([1, 1])
  const [message, setMessage] = useState<{ error: boolean; text: string }>()
  const touchAnchor = useRef<Cell | null>(null)
  const touchInput = useRef(false)
  const { tray, placed, capacity, mask } = inventoryView(inventory)
  const selectedPlacement = placed.find(({ entry }) => entry.id === selected)
  const entry = selectedPlacement?.entry ?? tray.find(({ id }) => id === selected)
  const preview = entry && previewPlacement(inventory, entry.id, anchor)
  const locked = inventory.bag.combatActive

  function select(id?: string, position: Cell = [1, 1]) {
    touchAnchor.current = null
    setSelected(id)
    setAnchor(position)
    setMessage(undefined)
  }

  function send(command: InventoryCommand, success: string, clearSelection = false) {
    const result = onCommand(command)
    if (!result.ok) {
      setMessage({ error: true, text: result.error })
      return
    }
    if (clearSelection || result.fusion) setSelected(undefined)
    const fusion = result.fusion
    setMessage({ error: false, text: fusion
      ? `Fusión completada: ${fusion.item.name} ${fusion.placed ? 'en la mochila' : 'en la bandeja (sin espacio en la mochila)'}.`
      : success })
  }

  return <div className="inventory-panel panel">
    <div className="panel-title"><span>MOCHILA ESPACIAL</span><b>{capacity} CASILLAS HABILITADAS</b></div>
    <div className="inventory-grid" style={{ gridTemplateColumns: `repeat(${mask[0].length}, minmax(0, 1fr))` }}>
      {mask.flatMap((line, row) => line.map((open, column) => {
        const cell = [column, row] as const
        const occupant = placed.find(({ cells }) => cells.some(([x, y]) => x === column && y === row))
        const projected = preview?.cells.some(([x, y]) => x === column && y === row)
        const imageCell = occupant ? occupant.cells[0] : preview?.cells[0]
        const icon = imageCell?.[0] === column && imageCell[1] === row ? occupant?.entry.item ?? entry?.item : undefined
        const previewClass = projected ? preview?.fusion ? ' preview-fusion'
          : preview?.valid ? ' preview-valid' : ' preview-invalid' : ''
        return <button key={`${column}-${row}`} type="button"
          className={`inventory-cell${open ? '' : ' locked'}${occupant ? ' occupied' : ''}${previewClass}`}
          disabled={locked || (!entry && !occupant)}
          aria-label={`Fila ${row + 1}, columna ${column + 1}${occupant ? `, ${occupant.entry.item.name}` : ''}${open ? '' : ', bloqueada'}`}
          onFocus={() => { if (entry) setAnchor(cell) }}
          onPointerDown={(event) => { touchInput.current = event.pointerType !== 'mouse' }}
          onPointerEnter={(event) => { if (entry && event.pointerType === 'mouse') setAnchor(cell) }}
          onClick={(event) => {
            if (entry) {
              setAnchor(cell)
              if (event.detail && touchInput.current && (touchAnchor.current?.[0] !== column || touchAnchor.current?.[1] !== row)) {
                touchAnchor.current = cell
                setMessage(undefined)
                return
              }
              send({ kind: selectedPlacement ? 'move' : 'place', instanceId: entry.id, anchor: cell }, 'Posición guardada.', true)
              touchAnchor.current = null
            } else if (occupant) {
              select(occupant.entry.id, occupant.anchor)
            }
          }}
        >{icon && <ItemIcon key={icon.id} item={icon} />}</button>
      }))}
    </div>
    <p className="equipment-note">Selecciona un objeto y pulsa una casilla para colocarlo. Pulsa una pieza colocada para moverla o rotarla.</p>
    {entry && <p className="touch-placement equipment-note">En pantalla táctil, pulsa una vez para ver la posición y otra para confirmarla.</p>}
    {entry && <p className="equipment-note" role="status">
      <span className="item-name"><ItemIcon key={entry.item.id} item={entry.item} />{entry.item.name}</span>
      {' · '}{entry.rotation}° · Fila {anchor[1] + 1}, columna {anchor[0] + 1} · {preview?.valid ? 'Posición válida' : 'Posición inválida'}
    </p>}
    {preview?.fusion && <p className="fusion-availability" role="status">Al confirmar: fusión en {preview.fusion.name}.</p>}
    {entry && <div className="equipment-summary">
      <ItemShape item={entry.item} rotation={entry.rotation} />
      <button className="secondary-button" disabled={locked} onClick={() =>
        send({ kind: 'rotate', instanceId: entry.id }, 'Rotación guardada.')
      }>ROTAR 90°</button>
      {selectedPlacement && <button className="secondary-button" disabled={locked} onClick={() =>
        send({ kind: 'remove', instanceId: entry.id }, 'Objeto devuelto a la bandeja.', true)
      }>RETIRAR</button>}
      <button className="secondary-button" onClick={() => select()}>CANCELAR SELECCIÓN</button>
    </div>}
    {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    <Tray entries={tray} selected={selected} onSelect={locked ? undefined : select} />
    <FusionGuide placed={placed} tray={tray} />
  </div>
}
