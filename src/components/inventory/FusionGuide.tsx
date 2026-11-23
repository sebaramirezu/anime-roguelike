import { fusionRecipes } from '../../data/fusionRecipes'
import type { InventorySnapshot } from '../../data/expeditionInventory'
import { items, type Item } from '../../data/items'

const catalogue = new Map(items.map((item) => [item.id, item]))

function RecipeItem({ item, status }: { item: Item; status?: string }) {
  return <div className="fusion-item">
    <span className="equipment-icon" aria-hidden="true">{item.icon}</span>
    <strong>{item.name}</strong>
    <small>Nivel {item.level}{status && ` · ${status}`}</small>
  </div>
}

export function FusionGuide({ placed, tray }: Pick<InventorySnapshot, 'placed' | 'tray'>) {
  function status(id: string) {
    if (placed.some(({ entry }) => entry.item.id === id)) return 'En mochila'
    return tray.some(({ item }) => item.id === id) ? 'En bandeja' : 'No lo tienes'
  }

  return <details className="fusion-guide">
    <summary>GUÍA DE FUSIONES</summary>
    <p>Las dos piezas deben estar colocadas y compartir un borde. La fusión ocurre al confirmar una colocación, un movimiento o un giro.</p>
    {fusionRecipes.map(({ ingredients: [firstId, secondId], result }) => {
      const first = catalogue.get(firstId)
      const second = catalogue.get(secondId)
      const outcome = catalogue.get(result)
      if (!first || !second || !outcome) return null
      const firstStatus = status(firstId)
      const secondStatus = status(secondId)
      const owned = [firstStatus, secondStatus].filter((entry) => entry !== 'No lo tienes').length
      const effects = outcome.effects.flatMap((effect) => effect.kind === 'technique' ? [effect.description] : [])
      return <article key={result} className="fusion-recipe">
        <div className="fusion-ingredients">
          <RecipeItem item={first} status={firstStatus} />
          <span className="fusion-symbol" aria-label="más">+</span>
          <RecipeItem item={second} status={secondStatus} />
          <span className="fusion-symbol" aria-label="da">→</span>
          <RecipeItem item={outcome} />
        </div>
        <p>{effects.join(' ') || outcome.description}</p>
        <p className="fusion-availability">{owned === 2 ? 'Fusión posible al colocarlos juntos'
          : owned === 1 ? 'Tienes un ingrediente' : 'No posees los ingredientes'}</p>
      </article>
    })}
  </details>
}
