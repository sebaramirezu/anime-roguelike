import { useState } from 'react'
import { itemIconSource } from '../../assets/itemIcons'
import type { Item } from '../../data/items'

export function ItemIcon({ item, framed = false }: { item: Item; framed?: boolean }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())
  const src = itemIconSource(item.id, failed, item.iconPng)

  return <span className={`item-art${framed ? ' equipment-icon' : ''}`} aria-hidden="true" data-item-icon={item.id}>
    {src ? <img key={src} src={src} alt="" draggable={false}
      onError={() => setFailed((previous) => new Set([...previous, src]))} /> : item.icon}
  </span>
}
