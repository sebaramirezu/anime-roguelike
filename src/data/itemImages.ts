import baryonMode from '../assets/items/png/baryon-mode.png'
import basicShield from '../assets/items/png/basic-shield.png'
import completoItaliano from '../assets/items/png/completo-italiano.png'
import genkidamaConcentrated from '../assets/items/png/genkidama-concentrated.png'
import genkidama from '../assets/items/png/genkidama.png'
import healingPotion from '../assets/items/png/healing-potion.png'
import kaioken from '../assets/items/png/kaioken.png'
import kamehameha from '../assets/items/png/kamehameha.png'
import kiSpheres from '../assets/items/png/ki-spheres.png'
import kunai from '../assets/items/png/kunai.png'
import kyubiChakra from '../assets/items/png/kyubi-chakra.png'
import protectiveHelmet from '../assets/items/png/protective-helmet.png'
import rasengan from '../assets/items/png/rasengan.png'
import rasenshurikenKurama from '../assets/items/png/rasenshuriken-kurama.png'
import rasenshuriken from '../assets/items/png/rasenshuriken.png'
import reinforcedArmor from '../assets/items/png/reinforced-armor.png'
import shadowClones from '../assets/items/png/shadow-clones.png'
import staff from '../assets/items/png/staff.png'
import swiftGloves from '../assets/items/png/swift-gloves.png'
import ultraInstinct from '../assets/items/png/ultra-instinct.png'

/** Images stay in the presentation layer; the engine consumes only item data. */
export const itemImages: Readonly<Record<string, string>> = {
  'power-pole': staff,
  'ki-orbs': kiSpheres,
  kaioken,
  kamehameha,
  'spirit-bomb': genkidama,
  'focused-spirit-bomb': genkidamaConcentrated,
  'ultra-instinct': ultraInstinct,
  kunai,
  'shadow-clones': shadowClones,
  'nine-tails-chakra': kyubiChakra,
  rasengan,
  rasenshuriken,
  'kurama-rasenshuriken': rasenshurikenKurama,
  'baryon-mode': baryonMode,
  'basic-shield': basicShield,
  'reinforced-armor': reinforcedArmor,
  'swift-gloves': swiftGloves,
  'protective-helmet': protectiveHelmet,
  'healing-potion': healingPotion,
  'completo-italiano': completoItaliano,
}
