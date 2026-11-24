import { useState, type ReactNode } from 'react'
import { heroSprites } from '../assets/heroSprites'
import { Tray } from '../components/inventory/Backpack'
import { FusionGuide } from '../components/inventory/FusionGuide'
import { ItemIcon } from '../components/inventory/ItemIcon'
import { ItemShape } from '../components/inventory/ItemShape'
import { inventoryView } from '../data/expeditionInventory'
import { catalogFor, describeItemEffect, type CharacterId, type Item } from '../data/items'
import { equipmentConfig, selectedSupply, supplyCost, validStarterSelection, type EquipmentSession } from '../data/equipmentSession'

function ItemCard({ item, children }: { item: Item; children?: ReactNode }) {
  return <article className="equipment-card panel" data-tier={item.level}>
    <header><ItemIcon item={item} framed /><div>
      <p className="equipment-tier">Nivel {item.level} · {item.rarity}</p>
      <h3>{item.name}</h3>
      <small>{item.category} · {item.universe}</small>
    </div></header>
    <p>{item.description}</p>
    <ul className="item-effects">{item.effects.map((effect) => {
      const label = describeItemEffect(effect)
      return <li key={label}>{label}</li>
    })}</ul>
    <ItemShape item={item} />
    {children}
  </article>
}

export function StarterItemsScreen({ character, name, onBack, onConfirm }: {
  character: CharacterId
  name: string
  onBack: () => void
  onConfirm: (selection: readonly Item[]) => void
}) {
  const [selection, setSelection] = useState<Item[]>([])
  const { supplyBudget, starterCount } = equipmentConfig
  const available = supplyBudget - selectedSupply(selection)
  const eligible = catalogFor(character).filter((item) => supplyCost(item) !== null)

  function toggle(item: Item) {
    setSelection((current) => {
      if (current.some(({ id }) => id === item.id)) return current.filter(({ id }) => id !== item.id)
      const cost = supplyCost(item)
      if (cost === null || current.length >= starterCount || selectedSupply(current) + cost > supplyBudget) return current
      return [...current, item]
    })
  }

  return <section className="screen-padding inner-screen">
    <div className="section-heading">
      <button className="back-button" onClick={onBack}>← CAMPEONES</button>
      <p className="eyebrow">PASO 02 / 03 · {name}</p>
      <h2>EQUIPAMIENTO <span>INICIAL</span></h2>
      <p>Elige dos objetos con un máximo de cinco puntos de suministro.</p>
    </div>
    <div className="equipment-summary" aria-live="polite">
      <span>{selection.length} / {starterCount} seleccionados</span>
      <strong>{available} / {supplyBudget} puntos disponibles</strong>
    </div>
    <div className="equipment-grid">{eligible.map((item) => {
      const selected = selection.some(({ id }) => id === item.id)
      const cost = supplyCost(item) ?? 0
      return <ItemCard item={item} key={item.id}>
        <button className="secondary-button" aria-label={`${selected ? 'Quitar' : 'Seleccionar'} ${item.name}, ${cost} puntos`}
          aria-pressed={selected} disabled={!selected && (cost > available || selection.length >= starterCount)}
          onClick={() => toggle(item)}>{selected ? '✓ QUITAR' : 'SELECCIONAR'} · {cost} PT</button>
      </ItemCard>
    })}</div>
    <div className="bottom-action">
      <span>{selection.map(({ name }) => name).join(' · ') || 'Elige tu equipo inicial'}</span>
      <button className="primary-button" disabled={!validStarterSelection(character, selection)} onClick={() => onConfirm(selection)}>CONFIRMAR →</button>
    </div>
  </section>
}

export function ShopScreen({ session, onBack, onBuy, onRefresh }: {
  session: EquipmentSession
  onBack: () => void
  onBuy: (id: string) => void
  onRefresh: () => void
}) {
  const { refreshPrice, provisionalGold } = equipmentConfig
  const { placed, tray } = inventoryView(session.inventory)
  return <section className="screen-padding inner-screen">
    <div className="section-heading">
      <button className="back-button" onClick={onBack}>← PREPARACIÓN</button>
      <p className="eyebrow">SUMINISTROS</p>
      <h2>TIENDA DE <span>EXPEDICIÓN</span></h2>
      <p>Oro inicial provisional de {provisionalGold}. El valor definitivo depende de la economía del juego.</p>
    </div>
    <div className="equipment-summary">
      <strong aria-live="polite">◆ {session.gold} de oro</strong>
      <button className="secondary-button" disabled={session.gold < refreshPrice} onClick={onRefresh}>RENOVAR · {refreshPrice} DE ORO</button>
    </div>
    <div className="equipment-grid">{session.offers.map(({ id, item, price, sold }) =>
      <ItemCard key={id} item={item}>
        <button className="primary-button" disabled={sold || session.gold < price}
          aria-label={`${sold ? 'Comprado' : 'Comprar'} ${item.name}, ${price} de oro`} onClick={() => onBuy(id)}>
          {sold ? '✓ COMPRADO' : session.gold < price ? 'ORO INSUFICIENTE' : 'COMPRAR'} · {price} ◆
        </button>
      </ItemCard>
    )}</div>
    <Tray entries={tray} />
    <FusionGuide character={session.character} placed={placed} tray={tray} />
  </section>
}

export function ArsenalScreen({ character, onSelect, onBack }: {
  character: CharacterId
  onSelect: (character: CharacterId) => void
  onBack: () => void
}) {
  const references = heroSprites[character].references
  const heroName = character === 'goku' ? 'Goku' : 'Naruto'
  return <section className="screen-padding inner-screen">
    <div className="section-heading">
      <button className="back-button" onClick={onBack}>← MENÚ</button>
      <p className="eyebrow">CATÁLOGO</p>
      <h2><span>ARSENAL</span></h2>
      <p>Consulta las técnicas, el equipo compartido y las recetas de fusión.</p>
    </div>
    <div className="equipment-summary">
      <button className="secondary-button" aria-pressed={character === 'goku'} onClick={() => onSelect('goku')}>GOKU</button>
      <button className="secondary-button" aria-pressed={character === 'naruto'} onClick={() => onSelect('naruto')}>NARUTO</button>
    </div>
    {references.length > 0 && <details key={character} className="hero-art-references" open={character === 'goku'}>
      <summary>Variantes visuales de {heroName}</summary>
      <div>{references.map(({ src, label, pixelArt }) => <figure key={label}>
        <img src={src} alt={`${heroName}: ${label}`} data-pixel-art={pixelArt} loading="lazy" />
        <figcaption>{label}</figcaption>
      </figure>)}</div>
    </details>}
    <div className="equipment-grid">{catalogFor(character).map((item) => <ItemCard key={item.id} item={item}>
      <small>{item.price === null ? 'Solo por fusión' : `${item.price} ◆ de oro`}</small>
    </ItemCard>)}</div>
    <FusionGuide />
  </section>
}
