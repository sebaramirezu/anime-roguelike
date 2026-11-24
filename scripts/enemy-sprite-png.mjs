import sharp from 'sharp'

export const sourceSize = 1024
export const spriteSize = 64

export async function inspectPng(bytes, expectedSize) {
  const image = sharp(bytes)
  const { format, width, height, hasAlpha } = await image.metadata()
  if (format !== 'png' || !width || !height) throw new Error('El archivo debe ser un PNG válido.')
  if (expectedSize && (width !== expectedSize || height !== expectedSize)) {
    throw new Error(`Dimensiones recibidas ${width} × ${height}. Se esperaban ${expectedSize} × ${expectedSize} px.`)
  }
  if (!hasAlpha) throw new Error('El PNG carece de canal alfa.')

  const rgba = await image.toColourspace('srgb').ensureAlpha().raw({ depth: 'uchar' }).toBuffer()
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  let hasTransparentPixel = false
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = rgba[(y * width + x) * 4 + 3]
      if (alpha === 0) hasTransparentPixel = true
      if (alpha < 16) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  if (!hasTransparentPixel || right < 0) {
    throw new Error('El PNG debe contener un personaje visible sobre un fondo realmente transparente.')
  }
  return { width, height, bounds: { left, top, width: right - left + 1, height: bottom - top + 1 } }
}

export async function normalizeSprite(bytes, centered = false) {
  const { bounds } = await inspectPng(bytes, sourceSize)
  const sprite = await sharp(bytes).extract(bounds).resize(centered ? 52 : 55, centered ? 52 : 56, { fit: 'inside', kernel: 'nearest' })
    .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let offset = 3; offset < sprite.data.length; offset += 4) {
    sprite.data[offset] = sprite.data[offset] >= 128 ? 255 : 0
  }
  const left = Math.floor((spriteSize - sprite.info.width) / 2)
  const bottom = centered ? Math.ceil((spriteSize - sprite.info.height) / 2) : 2
  const normalized = await sharp(sprite.data, { raw: sprite.info }).extend({
    left, right: spriteSize - sprite.info.width - left,
    top: spriteSize - sprite.info.height - bottom, bottom,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png({ palette: true, colours: 32, dither: 0 }).toBuffer()
  await inspectPng(normalized, spriteSize)
  return normalized
}
