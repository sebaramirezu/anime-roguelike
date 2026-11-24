import { useRef, useState, type CSSProperties } from 'react'
import type { Cell, CharacterId, Item } from '../../data/items'
import { inventoryView, previewPlacement, previewRotation, type ExpeditionInventory, type InventoryCommand, type InventoryResponse, type UnplacedEntry } from '../../data/expeditionInventory'
import type { Rotation } from '../../engine'
import { FusionGuide } from './FusionGuide'
import { ItemIcon } from './ItemIcon'
import { ItemShape } from './ItemShape'

function cellKey([column, row]: Cell) {
  return `${column},${row}`
}

function cellBounds(cells: readonly Cell[]) {
  const columns = cells.map(([column]) => column)
  const rows = cells.map(([, row]) => row)
  const column = Math.min(...columns)
  const row = Math.min(...rows)
  return { column, row, width: Math.max(...columns) - column + 1, height: Math.max(...rows) - row + 1 }
}

function cellOffset(cells: number) {
  return `calc(${cells} * var(--inventory-cell-step))`
}

function spanSize(cells: number) {
  return `calc(${cells} * var(--inventory-cell-step) - var(--inventory-gap))`
}

function artworkMask(cells: readonly Cell[], bounds: ReturnType<typeof cellBounds>) {
  if (cells.length === bounds.width * bounds.height) return undefined

  const occupied = new Set(cells.map(cellKey))
  return cells.map(([column, row]) => {
    const left = cellOffset(column - bounds.column)
    const top = cellOffset(row - bounds.row)
    // Keep the image continuous across gaps that separate occupied neighbors.
    const width = occupied.has(cellKey([column + 1, row])) ? 'var(--inventory-cell-step)' : 'var(--inventory-cell-size)'
    const height = occupied.has(cellKey([column, row + 1])) ? 'var(--inventory-cell-step)' : 'var(--inventory-cell-size)'
    return `linear-gradient(#000, #000) ${left} ${top} / ${width} ${height} no-repeat`
  }).join(', ')
}

function BackpackArtwork({ item, rotation, cells, previewCells }: {
  item: Item
  rotation: Rotation
  cells: readonly Cell[]
  previewCells?: readonly Cell[]
}) {
  const visibleCells = previewCells ?? cells
  const bounds = cellBounds(visibleCells)
  const shape = previewCells ? cellBounds(cells) : bounds
  const quarterTurn = rotation === 90 || rotation === 270
  const width = quarterTurn ? shape.height : shape.width
  const height = quarterTurn ? shape.width : shape.height

  return <div className={`inventory-artwork${previewCells ? ' inventory-artwork-preview' : ''}`} aria-hidden="true" style={{
    gridColumn: `${bounds.column + 1} / span ${bounds.width}`,
    gridRow: `${bounds.row + 1} / span ${bounds.height}`,
    mask: artworkMask(visibleCells, bounds),
  }}>
    <ItemIcon item={item} footprint={{
      width, height,
      style: {
        left: `calc(${cellOffset(shape.column - bounds.column)} + ${spanSize(shape.width)} / 2)`,
        top: `calc(${cellOffset(shape.row - bounds.row)} + ${spanSize(shape.height)} / 2)`,
        width: spanSize(width),
        height: spanSize(height),
        rotate: `${rotation}deg`,
      },
    }} />
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

export function Backpack({ character, inventory, onCommand }: {
  character?: CharacterId
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
  const rotationFusion = selectedPlacement && previewRotation(inventory, selectedPlacement.entry.id)?.fusion
  const locked = inventory.bag.combatActive
  const occupants = new Map(placed.flatMap((placement) => placement.cells.map((cell) => [cellKey(cell), placement] as const)))
  const previewCells = preview?.cells.filter((cell) => {
    const [column, row] = cell
    return mask[row]?.[column] !== undefined && !occupants.has(cellKey(cell))
  })

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
    <div className="inventory-grid" style={{ '--inventory-columns': mask[0].length } as CSSProperties}>
      {mask.flatMap((line, row) => line.map((open, column) => {
        const cell = [column, row] as const
        const key = cellKey(cell)
        const occupant = occupants.get(key)
        const projected = preview?.cells.some(([x, y]) => x === column && y === row)
        const previewClass = projected ? preview?.fusion ? ' preview-fusion'
          : preview?.valid ? ' preview-valid' : ' preview-invalid' : ''
        return <button key={key} type="button"
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
        />
      }))}
      {placed.map(({ entry: { id, item, rotation }, cells }) =>
        <BackpackArtwork key={id} item={item} rotation={rotation} cells={cells} />)}
      {entry && preview && !!previewCells?.length &&
        <BackpackArtwork item={entry.item} rotation={entry.rotation} cells={preview.cells} previewCells={previewCells} />}
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
      }>ROTAR 90°{rotationFusion && ` · FUSIÓN EN ${rotationFusion.name}`}</button>
      {selectedPlacement && <button className="secondary-button" disabled={locked} onClick={() =>
        send({ kind: 'remove', instanceId: entry.id }, 'Objeto devuelto a la bandeja.', true)
      }>RETIRAR</button>}
      <button className="secondary-button" onClick={() => select()}>CANCELAR SELECCIÓN</button>
    </div>}
    {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    <Tray entries={tray} selected={selected} onSelect={locked ? undefined : select} />
    <FusionGuide character={character} placed={placed} tray={tray} />
  </div>
}
