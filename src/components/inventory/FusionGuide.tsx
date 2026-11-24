import { fusionRecipes } from '../../data/fusionRecipes'
import type { InventorySnapshot } from '../../data/expeditionInventory'
import { describeItemEffect, items, type CharacterId, type Item } from '../../data/items'
import { ItemIcon } from './ItemIcon'
import { ItemShape } from './ItemShape'

const catalogue = new Map(items.map((item) => [item.id, item]))
const groups = [
  { owner: 'shared', name: 'Universales' },
  { owner: 'goku', name: 'Goku' },
  { owner: 'naruto', name: 'Naruto' },
] as const

const recipes = fusionRecipes.map(({ ingredients: [first, second], result }) => ({
  first: catalogue.get(first)!, second: catalogue.get(second)!, outcome: catalogue.get(result)!,
}))

function RecipeItem({ item, status }: { item: Item; status?: string }) {
  return <div className="fusion-item">
    <ItemIcon item={item} framed />
    <strong>{item.name}</strong>
    <small>Nivel {item.level}{status && ` · ${status}`}</small>
  </div>
}

export function FusionGuide({ character, placed, tray }: Partial<Pick<InventorySnapshot, 'placed' | 'tray'>> & {
  character?: CharacterId
}) {
  function ingredientStatus(item: Item, copy = 1) {
    const source = item.price === null ? 'Solo por fusión' : 'Se vende en la tienda'
    if (!placed || !tray) return { owned: false, label: source }
    const equipped = placed.filter(({ entry }) => entry.item.id === item.id).length
    const stored = tray.filter(({ item: entry }) => entry.id === item.id).length
    if (equipped >= copy) return { owned: true, label: 'En mochila' }
    if (equipped + stored >= copy) return { owned: true, label: 'En bandeja' }
    return { owned: false, label: `Falta · ${source}` }
  }

  return <details className="fusion-guide">
    <summary>GUÍA DE FUSIONES</summary>
    <p>Las dos piezas deben compartir un borde horizontal o vertical. La fusión ocurre al confirmar una colocación, un movimiento o un giro.</p>
    {groups.filter(({ owner }) => !character || owner === 'shared' || owner === character).map(({ owner, name }) =>
      <section key={owner} className="fusion-group">
        <h3>{name}</h3>
        {recipes.filter(({ outcome }) => outcome.owner === owner).map(({ first, second, outcome }) => {
          const firstStatus = ingredientStatus(first)
          const secondStatus = ingredientStatus(second, first.id === second.id ? 2 : 1)
          const owned = Number(firstStatus.owned) + Number(secondStatus.owned)
          return <article key={outcome.id} className="fusion-recipe">
            <div className="fusion-ingredients">
              <RecipeItem item={first} status={firstStatus.label} />
              <span className="fusion-symbol" aria-label="más">+</span>
              <RecipeItem item={second} status={secondStatus.label} />
              <span className="fusion-symbol" aria-label="da">→</span>
              <RecipeItem item={outcome} />
            </div>
            <ItemShape item={outcome} />
            <ul className="item-effects">{outcome.effects.map((effect) => {
              const label = describeItemEffect(effect)
              return <li key={label}>{label}</li>
            })}</ul>
            {placed && tray && <p className="fusion-availability">{owned === 2 ? 'Fusión posible al colocarlos juntos'
              : owned === 1 ? 'Tienes un ingrediente' : 'No posees los ingredientes'}</p>}
          </article>
        })}
      </section>)}
  </details>
}
