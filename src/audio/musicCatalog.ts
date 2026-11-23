export const musicCatalog = {
  menu: { stem: 'opening', loop: true },
  preparation: { stem: 'preparacion', loop: true },
  normal: { stem: 'combate-normal', loop: true },
  minor: { stem: 'miniboss', loop: true },
  major: { stem: 'jefe-mayor', loop: true },
  victory: { stem: 'victoria', loop: false },
  defeat: { stem: 'derrota', loop: false },
} as const

export type MusicScene = keyof typeof musicCatalog
