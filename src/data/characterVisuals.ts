import gokuPhaseOne from '../assets/items/png/gokufase1.png'
import gokuPhaseTwo from '../assets/items/png/gokufase2.png'
import narutoPhaseOne from '../assets/items/png/narutofase1.png'
import narutoPhaseTwo from '../assets/items/png/naruto1-removebg-preview.png'
import narutoPhaseThree from '../assets/items/png/naruto2.png'
import narutoPhaseFour from '../assets/items/png/naruto3-removebg-preview.png'
import type { CharacterId } from './items'

export interface CharacterPhaseVisual {
  label: string
  imageSrc: string
}

export interface CharacterVisuals {
  portrait: string
  phases: readonly CharacterPhaseVisual[]
}

/** Labels remain neutral until the game defines each transformation mechanically. */
export const characterVisuals: Readonly<Record<CharacterId, CharacterVisuals>> = {
  goku: {
    portrait: gokuPhaseOne,
    phases: [
      { label: 'Fase 1', imageSrc: gokuPhaseOne },
      { label: 'Fase 2', imageSrc: gokuPhaseTwo },
    ],
  },
  naruto: {
    portrait: narutoPhaseOne,
    phases: [
      { label: 'Fase 1', imageSrc: narutoPhaseOne },
      { label: 'Fase 2', imageSrc: narutoPhaseTwo },
      { label: 'Fase 3', imageSrc: narutoPhaseThree },
      { label: 'Fase 4', imageSrc: narutoPhaseFour },
    ],
  },
}
