import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { heroSprites } from '../assets/heroSprites'
import { ArsenalScreen } from './EquipmentScreens'

it('shows both Goku portraits in the open Arsenal gallery', () => {
  const html = renderToStaticMarkup(createElement(ArsenalScreen, {
    character: 'goku', onSelect: () => {}, onBack: () => {},
  }))
  expect(html).toContain('<details class="hero-art-references" open="">')
  expect(html).toContain(`src="${heroSprites.goku.base}" alt="Goku: Forma base"`)
  expect(html).toContain(`src="${heroSprites.goku.forms['ultra-instinct']}" alt="Goku: Migatte no Gokui"`)
})
