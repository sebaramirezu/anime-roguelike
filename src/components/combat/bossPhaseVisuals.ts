type BossPhaseVisual = {
  color: string
  accent: string
  motif: 'surge' | 'arcs' | 'halo' | 'embers' | 'mist' | 'sand' | 'flame' | 'waves'
}

export const bossPhaseVisuals: Readonly<Partial<Record<string, BossPhaseVisual>>> = {
  'goku-piccolo': { color: '#79e698', accent: '#cef7ad', motif: 'surge' },
  'goku-vegeta': { color: '#77baff', accent: '#f7dd76', motif: 'arcs' },
  'goku-freezer': { color: '#b386f5', accent: '#dfbcff', motif: 'halo' },
  'goku-cell': { color: '#79de77', accent: '#ddf89a', motif: 'arcs' },
  'goku-majin-buu': { color: '#f592c5', accent: '#ffd5e4', motif: 'embers' },
  'naruto-zabuza': { color: '#83c9e8', accent: '#cce4f6', motif: 'mist' },
  'naruto-orochimaru': { color: '#865cb3', accent: '#ba96df', motif: 'surge' },
  'naruto-gaara': { color: '#dfb477', accent: '#f4da9f', motif: 'sand' },
  'naruto-itachi': { color: '#ef727b', accent: '#ffae92', motif: 'flame' },
  'naruto-pain': { color: '#ad90e7', accent: '#d9bcff', motif: 'waves' },
}
