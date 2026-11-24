export const itemIconTargets = [
  { id: 'saiyan-armor', name: 'Armadura Saiyajin' },
  { id: 'ki-barrier', name: 'Barrera de Ki' },
  { id: 'vitality-orb', name: 'Esfera de Vitalidad' },
].map((item) => ({
  ...item, character: 'goku', kind: 'item', path: `src/assets/items/png/${item.id}.png`,
}))
