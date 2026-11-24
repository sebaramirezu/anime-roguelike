import { useState, type CSSProperties } from 'react'
import { backpackItemArt, itemIconSource } from '../../assets/itemIcons'
import type { Item } from '../../data/items'

type Footprint = { width: number; height: number; style: CSSProperties }

function footprintImageStyle(id: string, src: string, { width, height }: Footprint): CSSProperties | undefined {
  const art = backpackItemArt(id, src)
  if (!art) return undefined

  const { fit, angle, offset, scale = 1 } = art
  const [x, y] = typeof scale === 'number' ? [scale, scale] : scale
  const shortSide = Math.min(width, height)
  // Transform the artwork itself so SVGs and square PNGs stretch by the same amount.
  return {
    objectFit: fit === 'cover' ? 'cover' : 'contain',
    rotate: angle === undefined ? undefined : `${angle}deg`,
    scale: fit === 'stretch' ? `${x * width / shortSide} ${y * height / shortSide}` : `${x} ${y}`,
    translate: offset,
  }
}

export function ItemIcon({ item, framed = false, footprint }: {
  item: Item
  framed?: boolean
  footprint?: Footprint
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())
  const src = itemIconSource(item.id, failed, item.iconPng)
  const imageStyle = src && footprint ? footprintImageStyle(item.id, src, footprint) : undefined

  return <span className={`item-art${framed ? ' equipment-icon' : ''}`} style={footprint?.style} aria-hidden="true" data-item-icon={item.id}>
    {src ? <img key={src} src={src} alt="" draggable={false} style={imageStyle}
      onError={() => setFailed((previous) => new Set([...previous, src]))} /> : item.icon}
  </span>
}
